'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Sparkles } from 'lucide-react';
import RoomCard from './RoomCard';
import RoomPreviewModal from './RoomPreviewModal';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

// Force cache bust for banner images

type RoomCategory = 'gaming' | 'music' | 'entertainment' | 'Gaming' | 'Music' | 'Entertainment';
type RoomStatus = 'draft' | 'interest' | 'opening_soon' | 'live' | 'paused' | 'coming_soon';

export type ComingSoonRoom = {
  id: string;
  room_key?: string;
  name: string;
  category: RoomCategory;
  status: RoomStatus;
  description?: string | null;
  subtitle?: string | null;
  image_url: string | null;
  fallback_gradient?: string;
  current_interest_count?: number;
  interest_count?: number;
  interest_threshold?: number;
  disclaimer_required?: boolean;
  special_badge?: string;
};

export default function RoomsCarousel() {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [rooms, setRooms] = useState<ComingSoonRoom[] | null>(null);
  const [interestedRoomIds, setInterestedRoomIds] = useState<Set<string>>(new Set());
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const supabase = createClient();

  const selectedRoom = useMemo(() => {
    if (!selectedRoomId || !rooms) return null;
    return rooms.find((r) => r.id === selectedRoomId) || null;
  }, [rooms, selectedRoomId]);

  useEffect(() => {
    let cancelled = false;

    const loadRooms = async () => {
      try {
        const res = await fetch('/api/rooms');
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          console.error('[ROOMS] failed to load rooms:', json);
          if (!cancelled) setRooms([]);
          return;
        }
        const dbRooms = (json?.rooms as ComingSoonRoom[]) ?? [];
        if (!cancelled) setRooms(dbRooms);
      } catch (err) {
        console.error('[ROOMS] rooms fetch exception:', err);
        if (!cancelled) setRooms([]);
      }
    };

    const loadInterests = async () => {
      try {
        const res = await fetch('/api/rooms/interests');
        if (res.status === 401) {
          if (!cancelled) setInterestedRoomIds(new Set());
          return;
        }
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          console.error('[ROOMS] failed to load interests:', json);
          return;
        }
        const ids = Array.isArray(json?.room_ids) ? (json.room_ids as string[]) : [];
        if (!cancelled) setInterestedRoomIds(new Set(ids));
      } catch (err) {
        console.error('[ROOMS] interests fetch exception:', err);
      }
    };

    loadRooms();
    loadInterests();

    return () => {
      cancelled = true;
    };
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (!scrollContainerRef.current) return;
    const scrollAmount = 300;
    const newScrollLeft = scrollContainerRef.current.scrollLeft + 
                          (direction === 'right' ? scrollAmount : -scrollAmount);
    scrollContainerRef.current.scrollTo({ left: newScrollLeft, behavior: 'smooth' });
  };

  const handleOpenPreview = (room: ComingSoonRoom) => {
    setSelectedRoomId(room.id);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    // Delay clearing room to allow exit animation
    setTimeout(() => setSelectedRoomId(null), 200);
  };

  const setRoomInterestCount = (roomId: string, newCount: number) => {
    setRooms((prev) => {
      if (!prev) return prev;
      // Update both field names so the UI works regardless of data source
      return prev.map((r) => (r.id === roomId ? { ...r, current_interest_count: newCount, interest_count: newCount } : r));
    });
  };

  const setRoomInterested = (roomId: string, interested: boolean) => {
    setInterestedRoomIds((prev) => {
      const next = new Set(prev);
      if (interested) next.add(roomId);
      else next.delete(roomId);
      return next;
    });
  };

  const handleToggleInterest = async (room: ComingSoonRoom, nextInterested: boolean) => {
    if (room.disclaimer_required && nextInterested) {
      const ok = window.confirm('This room requires consent and community guideline compliance. I understand.');
      if (!ok) return;
    }

    const prevInterested = interestedRoomIds.has(room.id);
    // Support both DB format (current_interest_count) and mock format (interest_count)
    const prevCount: number = Number(room.current_interest_count ?? room.interest_count ?? 0);
    const optimisticCount = Math.max(prevCount + (nextInterested ? 1 : -1), 0);

    setRoomInterested(room.id, nextInterested);
    setRoomInterestCount(room.id, optimisticCount);

    try {
      const res = await fetch(`/api/rooms/${room.id}/interest`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ interested: nextInterested }),
      });

      if (res.status === 401) {
        setRoomInterested(room.id, prevInterested);
        setRoomInterestCount(room.id, prevCount);
        alert('Please log in to mark interest.');
        return;
      }

      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setRoomInterested(room.id, prevInterested);
        setRoomInterestCount(room.id, prevCount);
        console.error('[ROOMS] toggle interest error:', json);
        return;
      }

      setRoomInterested(room.id, !!json?.interested);
      setRoomInterestCount(room.id, (json?.current_interest_count as number) ?? optimisticCount);
    } catch (err) {
      setRoomInterested(room.id, prevInterested);
      setRoomInterestCount(room.id, prevCount);
      console.error('[ROOMS] toggle interest exception:', err);
    }
  };

  return (
    <section className="relative py-8">
      {/* Section Header */}
      <div className="flex items-start justify-between mb-6 px-1">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-amber-500" />
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              Future Rooms
            </h2>
          </div>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl">
            Vote on themed rooms you want next.
          </p>
        </div>

        {/* Navigation Arrows */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => scroll('left')}
            className="p-2.5 rounded-full bg-card border border-border 
                       hover:bg-muted hover:border-primary/50 transition-all duration-200
                       shadow-sm hover:shadow-md"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-5 h-5 text-foreground" />
          </button>
          <button
            onClick={() => scroll('right')}
            className="p-2.5 rounded-full bg-card border border-border 
                       hover:bg-muted hover:border-primary/50 transition-all duration-200
                       shadow-sm hover:shadow-md"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-5 h-5 text-foreground" />
          </button>
        </div>
      </div>

      {/* Carousel Container */}
      <div className="relative">
        {/* Scroll Container */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-4 scroll-smooth scrollbar-hidden"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {/* Left Padding for edge alignment */}
          <div className="flex-shrink-0 w-0.5 md:w-1" />
          
          {(rooms ?? []).map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              interested={interestedRoomIds.has(room.id)}
              onOpenPreview={handleOpenPreview}
              onToggleInterest={handleToggleInterest}
            />
          ))}

          <Link
            href="/apply"
            className="
              group relative flex-shrink-0 w-[260px] md:w-[280px] 
              rounded-2xl overflow-hidden cursor-pointer
              transition-all duration-300 ease-out
              hover:scale-[1.03] hover:shadow-2xl hover:shadow-primary/20
              border border-white/10 hover:border-white/20
              bg-gradient-to-br from-primary/30 via-card/80 to-card
            "
          >
            <div className="relative h-[180px] md:h-[200px] p-5 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/40 backdrop-blur-sm border border-white/20">
                  <Plus className="w-4 h-4 text-white" />
                  <span className="text-xs font-semibold text-white">Submit a Room Idea</span>
                </div>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                  Submit a Room Idea
                </h3>
                <p className="text-sm text-muted-foreground">
                  Propose a themed room, add an image, and we&apos;ll track interest.
                </p>
                <div className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold w-fit">
                  Submit
                </div>
              </div>
            </div>
          </Link>
          
          {/* Right Padding */}
          <div className="flex-shrink-0 w-0.5 md:w-1" />
        </div>

        {/* Gradient Fade Overlays - Desktop only */}
        <div className="hidden md:block absolute left-0 top-0 bottom-4 w-16 
                        bg-gradient-to-r from-card to-transparent pointer-events-none z-10" />
        <div className="hidden md:block absolute right-0 top-0 bottom-4 w-16 
                        bg-gradient-to-l from-card to-transparent pointer-events-none z-10" />
      </div>

      {/* Mobile Scroll Hint */}
      <div className="flex md:hidden justify-center mt-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>←</span>
          <span>Swipe to explore</span>
          <span>→</span>
        </div>
      </div>

      {/* Room Preview Modal */}
      <RoomPreviewModal
        room={selectedRoom}
        interested={!!(selectedRoom && interestedRoomIds.has(selectedRoom.id))}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onToggleInterest={handleToggleInterest}
      />

      {/* Hide scrollbar CSS */}
      <style jsx>{`
        .scrollbar-hidden::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </section>
  );
}

