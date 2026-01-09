'use client';

import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Shield, Star, TrendingUp, Users, CheckCircle } from 'lucide-react';

interface MllProExplainerModalProps {
  isOpen: boolean;
  onClose: () => void;
  userIsPro?: boolean;
}

export function MllProExplainerModal({ isOpen, onClose, userIsPro = false }: MllProExplainerModalProps) {
  const router = useRouter();

  const handleApply = () => {
    onClose();
    router.push('/mll-pro/apply');
  };

  const handleLearnMore = () => {
    onClose();
    router.push('/mll-pro');
  };

  return (
    <div style={{ zIndex: 9999, position: 'relative' }}>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={userIsPro ? "You're an MLL PRO Member" : "What is MLL PRO?"}
        size="lg"
      >
      <div className="space-y-6">
        {userIsPro ? (
          <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-400/30 rounded-lg p-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">You're MLL PRO!</h3>
            <p className="text-gray-300">
              Thank you for being a valued member of the MLL PRO community. Your badge is displayed across the app.
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">MLL PRO</h3>
            <p className="text-gray-300">
              Recognition for creators who help build a positive, active community on MyLiveLinks.
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Star className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h4 className="font-semibold text-white mb-1">Recognition Badge</h4>
              <p className="text-sm text-gray-400">
                PRO badge appears next to your name across the entire app
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h4 className="font-semibold text-white mb-1">Featured Placement</h4>
              <p className="text-sm text-gray-400">
                Higher placement in LiveTV Featured when you go live
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <h4 className="font-semibold text-white mb-1">Community First</h4>
              <p className="text-sm text-gray-400">
                Help grow the platform by bringing your community with you
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h4 className="font-semibold text-white mb-1">No Contracts or Quotas</h4>
              <p className="text-sm text-gray-400">
                No minimum streaming hours, earnings requirements, or forced commitments
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          {!userIsPro && (
            <Button
              onClick={handleApply}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold"
            >
              Apply for MLL PRO
            </Button>
          )}
          <Button
            onClick={handleLearnMore}
            variant="outline"
            className={`${userIsPro ? 'flex-1' : 'flex-1'} border-purple-400 text-purple-400 hover:bg-purple-500/10`}
          >
            Learn More
          </Button>
        </div>
      </div>
    </Modal>
    </div>
  );
}
