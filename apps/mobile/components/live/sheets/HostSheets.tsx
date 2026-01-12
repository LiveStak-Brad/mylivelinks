import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface BaseSheetProps {
  visible: boolean;
  onClose: () => void;
}

function SheetContainer({ visible, onClose, title, children }: BaseSheetProps & { title: string; children: React.ReactNode }) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.8)" />
            </Pressable>
          </View>
          <View style={styles.content}>
            {children}
          </View>
        </View>
      </View>
    </Modal>
  );
}

// Settings Sheet
export function SettingsSheet({ visible, onClose }: BaseSheetProps) {
  return (
    <SheetContainer visible={visible} onClose={onClose} title="Stream Settings">
      <View style={styles.row}>
        <Ionicons name="camera-reverse-outline" size={22} color="#FFFFFF" />
        <Text style={styles.rowText}>Flip Camera</Text>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
      </View>
      <View style={styles.row}>
        <Ionicons name="mic-outline" size={22} color="#FFFFFF" />
        <Text style={styles.rowText}>Microphone</Text>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
      </View>
      <View style={styles.row}>
        <Ionicons name="videocam-outline" size={22} color="#FFFFFF" />
        <Text style={styles.rowText}>Video Quality</Text>
        <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
      </View>
      <Text style={styles.placeholder}>Settings are UI-only placeholders</Text>
    </SheetContainer>
  );
}

// Guests Sheet
export function GuestsSheet({ visible, onClose }: BaseSheetProps) {
  return (
    <SheetContainer visible={visible} onClose={onClose} title="Guest Requests">
      <View style={styles.emptyState}>
        <Ionicons name="people-outline" size={48} color="rgba(255,255,255,0.3)" />
        <Text style={styles.emptyTitle}>No guest requests</Text>
        <Text style={styles.emptySubtitle}>Viewers can request to join your stream</Text>
      </View>
      <Text style={styles.placeholder}>Guest management is UI-only</Text>
    </SheetContainer>
  );
}

// Battle Sheet
export function BattleSheet({ visible, onClose }: BaseSheetProps) {
  return (
    <SheetContainer visible={visible} onClose={onClose} title="Battle Mode">
      <View style={styles.emptyState}>
        <Ionicons name="flash" size={48} color="#F97316" />
        <Text style={styles.emptyTitle}>Start a Battle</Text>
        <Text style={styles.emptySubtitle}>Challenge another host to a gift battle</Text>
      </View>
      <Pressable style={styles.actionButton}>
        <Text style={styles.actionButtonText}>Find Opponent</Text>
      </Pressable>
      <Text style={styles.placeholder}>Battle mode is UI-only</Text>
    </SheetContainer>
  );
}

// CoHost Sheet
export function CoHostSheet({ visible, onClose }: BaseSheetProps) {
  return (
    <SheetContainer visible={visible} onClose={onClose} title="Invite Co-Host">
      <View style={styles.emptyState}>
        <Ionicons name="person-add" size={48} color="#A855F7" />
        <Text style={styles.emptyTitle}>Invite a Co-Host</Text>
        <Text style={styles.emptySubtitle}>Stream together with another creator</Text>
      </View>
      <Pressable style={[styles.actionButton, { backgroundColor: '#A855F7' }]}>
        <Text style={styles.actionButtonText}>Browse Hosts</Text>
      </Pressable>
      <Text style={styles.placeholder}>Co-host invites are UI-only</Text>
    </SheetContainer>
  );
}

// Filters Sheet
export function FiltersSheet({ visible, onClose }: BaseSheetProps) {
  return (
    <SheetContainer visible={visible} onClose={onClose} title="Video Filters">
      <View style={styles.row}>
        <Ionicons name="sunny-outline" size={22} color="#FFFFFF" />
        <Text style={styles.rowText}>Brightness</Text>
        <View style={styles.slider} />
      </View>
      <View style={styles.row}>
        <Ionicons name="contrast-outline" size={22} color="#FFFFFF" />
        <Text style={styles.rowText}>Contrast</Text>
        <View style={styles.slider} />
      </View>
      <View style={styles.row}>
        <Ionicons name="color-palette-outline" size={22} color="#FFFFFF" />
        <Text style={styles.rowText}>Saturation</Text>
        <View style={styles.slider} />
      </View>
      <View style={styles.row}>
        <Ionicons name="water-outline" size={22} color="#FFFFFF" />
        <Text style={styles.rowText}>Blur</Text>
        <View style={styles.slider} />
      </View>
      <Text style={styles.placeholder}>Filters are UI-only placeholders</Text>
    </SheetContainer>
  );
}

// Share Sheet
export function ShareSheet({ visible, onClose }: BaseSheetProps) {
  return (
    <SheetContainer visible={visible} onClose={onClose} title="Share Stream">
      <View style={styles.shareRow}>
        <Pressable style={styles.shareOption}>
          <View style={[styles.shareIcon, { backgroundColor: '#1DA1F2' }]}>
            <Ionicons name="logo-twitter" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.shareLabel}>Twitter</Text>
        </Pressable>
        <Pressable style={styles.shareOption}>
          <View style={[styles.shareIcon, { backgroundColor: '#4267B2' }]}>
            <Ionicons name="logo-facebook" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.shareLabel}>Facebook</Text>
        </Pressable>
        <Pressable style={styles.shareOption}>
          <View style={[styles.shareIcon, { backgroundColor: '#25D366' }]}>
            <Ionicons name="logo-whatsapp" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.shareLabel}>WhatsApp</Text>
        </Pressable>
        <Pressable style={styles.shareOption}>
          <View style={[styles.shareIcon, { backgroundColor: '#6366F1' }]}>
            <Ionicons name="link" size={24} color="#FFFFFF" />
          </View>
          <Text style={styles.shareLabel}>Copy Link</Text>
        </Pressable>
      </View>
      <Text style={styles.placeholder}>Share is UI-only</Text>
    </SheetContainer>
  );
}

// Viewers Sheet
export function ViewersSheet({ visible, onClose, viewerCount }: BaseSheetProps & { viewerCount: number }) {
  return (
    <SheetContainer visible={visible} onClose={onClose} title={`${viewerCount} Watching`}>
      <View style={styles.emptyState}>
        <Ionicons name="eye-outline" size={48} color="rgba(255,255,255,0.3)" />
        <Text style={styles.emptyTitle}>Viewer list</Text>
        <Text style={styles.emptySubtitle}>See who's watching your stream</Text>
      </View>
      <Text style={styles.placeholder}>Viewer list is UI-only</Text>
    </SheetContainer>
  );
}

// Gifters Sheet
export function GiftersSheet({ visible, onClose }: BaseSheetProps) {
  return (
    <SheetContainer visible={visible} onClose={onClose} title="Top Gifters">
      <View style={styles.emptyState}>
        <Ionicons name="gift" size={48} color="#FFD700" />
        <Text style={styles.emptyTitle}>Stream Gifters</Text>
        <Text style={styles.emptySubtitle}>See who's sent the most gifts</Text>
      </View>
      <Text style={styles.placeholder}>Gifter list is UI-only</Text>
    </SheetContainer>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#1A1A2E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    maxHeight: '70%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    gap: 12,
  },
  rowText: {
    flex: 1,
    fontSize: 15,
    color: '#FFFFFF',
  },
  slider: {
    width: 100,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  emptySubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
  },
  actionButton: {
    backgroundColor: '#F97316',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  placeholder: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    textAlign: 'center',
    marginTop: 16,
  },
  shareRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  shareOption: {
    alignItems: 'center',
    gap: 8,
  },
  shareIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
});
