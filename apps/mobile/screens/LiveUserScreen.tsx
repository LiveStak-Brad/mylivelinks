import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput } from 'react-native';
import ReportModal from '../components/ReportModal';
import ShareModal from '../components/ShareModal';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const MOCK_CHAT_MESSAGES = [
  { id: '1', username: 'viewer123', message: 'Amazing stream! 🔥' },
  { id: '2', username: 'fan456', message: 'Love this content' },
  { id: '3', username: 'supporter789', message: 'Keep it up!' },
];

export default function LiveUserScreen() {
  const [chatInput, setChatInput] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Video Placeholder Area */}
      <View style={styles.videoContainer}>
        <View style={styles.videoPlaceholder}>
          <Ionicons name="videocam" size={64} color="#666" />
          <Text style={styles.videoPlaceholderText}>Live Video Stream</Text>
        </View>

        {/* Top Overlay */}
        <View style={styles.topOverlay}>
          <View style={styles.creatorInfo}>
            <View style={styles.creatorAvatar}>
              <Ionicons name="person" size={24} color="#fff" />
            </View>
            <View style={styles.creatorDetails}>
              <Text style={styles.creatorName}>@username</Text>
              <Text style={styles.streamTitle}>Stream Title Here</Text>
            </View>
          </View>

          <View style={styles.topActions}>
            <View style={styles.viewerCountBadge}>
              <Ionicons name="eye" size={14} color="#fff" />
              <Text style={styles.viewerCountText}>1.2K</Text>
            </View>
            <TouchableOpacity style={styles.iconButton} onPress={() => setShowReportModal(true)}>
              <Ionicons name="flag-outline" size={20} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconButton}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Right-Side Vertical Actions Rail */}
        <View style={styles.rightRail}>
          <TouchableOpacity style={styles.railAction}>
            <Ionicons name="heart-outline" size={28} color="#fff" />
            <Text style={styles.railActionText}>12.5K</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.railAction}>
            <Ionicons name="chatbubble-outline" size={26} color="#fff" />
            <Text style={styles.railActionText}>234</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.railAction} onPress={() => setShowShareModal(true)}>
            <Ionicons name="share-social-outline" size={26} color="#fff" />
            <Text style={styles.railActionText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.railAction}>
            <Ionicons name="gift-outline" size={26} color="#fff" />
            <Text style={styles.railActionText}>Gift</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom Area: Chat Preview + Input Bar */}
      <View style={styles.bottomArea}>
        {/* Chat Preview List */}
        <FlatList
          data={MOCK_CHAT_MESSAGES}
          keyExtractor={(item) => item.id}
          style={styles.chatList}
          renderItem={({ item }) => (
            <View style={styles.chatMessage}>
              <Text style={styles.chatUsername}>{item.username}: </Text>
              <Text style={styles.chatText}>{item.message}</Text>
            </View>
          )}
        />

        {/* Input Bar + Quick Actions */}
        <View style={styles.inputContainer}>
          <View style={styles.inputRow}>
            <TextInput
              style={styles.chatInput}
              placeholder="Say something..."
              placeholderTextColor="#999"
              value={chatInput}
              onChangeText={setChatInput}
            />
            <TouchableOpacity style={styles.sendButton}>
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Quick Action Buttons */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="gift" size={18} color="#FF6B9D" />
              <Text style={styles.quickActionText}>Gift</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="heart" size={18} color="#FF4458" />
              <Text style={styles.quickActionText}>Like</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.quickActionButton}>
              <Ionicons name="star" size={18} color="#FFD700" />
              <Text style={styles.quickActionText}>Follow</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    {/* Report Modal */}
      <ReportModal
        visible={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportType="stream"
        reportedUserId={undefined}
        reportedUsername="username"
        contextDetails={JSON.stringify({
          stream_username: 'username',
          source: 'mobile_live_viewer',
        })}
      />

      {/* Share Modal */}
      <ShareModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl="https://www.mylivelinks.com/live/username"
        shareText="Check out this live stream on MyLiveLinks!"
        shareContentType="live"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  videoContainer: {
    flex: 1,
    position: 'relative',
  },
  videoPlaceholder: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlaceholderText: {
    color: '#666',
    fontSize: 16,
    marginTop: 12,
  },
  topOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 12,
    paddingTop: 16,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  creatorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  creatorAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  creatorDetails: {
    flex: 1,
  },
  creatorName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  streamTitle: {
    color: '#ddd',
    fontSize: 12,
    marginTop: 2,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  viewerCountBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  viewerCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 18,
  },
  rightRail: {
    position: 'absolute',
    right: 12,
    bottom: 120,
    gap: 20,
  },
  railAction: {
    alignItems: 'center',
    gap: 4,
  },
  railActionText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  bottomArea: {
    backgroundColor: '#1a1a1a',
    maxHeight: 280,
  },
  chatList: {
    maxHeight: 120,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chatMessage: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  chatUsername: {
    color: '#FF6B9D',
    fontSize: 13,
    fontWeight: '600',
  },
  chatText: {
    color: '#fff',
    fontSize: 13,
    flex: 1,
  },
  inputContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 14,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FF6B9D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  quickActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  quickActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
