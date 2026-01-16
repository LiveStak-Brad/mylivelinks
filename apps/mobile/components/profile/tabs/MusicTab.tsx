import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MusicShowcaseSection from '../MusicShowcaseSection';

interface MusicTabProps {
  profileId: string;
  colors: any;
  isOwnProfile?: boolean;
  cardStyle?: {
    backgroundColor: string;
    borderRadius: number;
    textColor?: string;
  };
}

export default function MusicTab({ profileId, colors, isOwnProfile = false, cardStyle }: MusicTabProps) {
  const navigation = useNavigation<any>();

  return (
    <View>
      <MusicShowcaseSection
        profileId={profileId}
        isOwnProfile={isOwnProfile}
        onEdit={() => navigation.navigate('CreatorStudioUploadScreen', { defaultType: 'music' })}
        colors={colors}
        cardStyle={cardStyle}
      />
    </View>
  );
}
