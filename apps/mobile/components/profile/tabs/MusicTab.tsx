import React from 'react';
import { View } from 'react-native';
import MusicShowcaseSection from '../MusicShowcaseSection';
import MusicVideosSection from '../MusicVideosSection';

interface MusicTabProps {
  profileId: string;
  colors: any;
}

export default function MusicTab({ profileId, colors }: MusicTabProps) {
  return (
    <View>
      <MusicShowcaseSection
        profileId={profileId}
        isOwnProfile={false}
        onEdit={() => {}}
        colors={colors}
      />
      <MusicVideosSection
        profileId={profileId}
        isOwnProfile={false}
        onEdit={() => {}}
        colors={colors}
      />
    </View>
  );
}
