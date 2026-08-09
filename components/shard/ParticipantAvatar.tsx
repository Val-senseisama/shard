import React, { memo } from 'react';
import { View, Text, Image } from 'react-native';
import { FONT } from '~/components/hud';
import { avatarUri } from '~/helpers/avatarUri';
import { ACCENT } from './constants';

interface ParticipantAvatarProps {
  participant: { profilePic?: string | null; username?: string | null; role?: string };
  size?: number;
}

export const ParticipantAvatar = memo(({ participant, size = 52 }: ParticipantAvatarProps) => {
  const uri = avatarUri(participant.profilePic, participant.username);
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <View
        style={{
          width: size + 6,
          height: size + 6,
          borderRadius: (size + 6) / 2,
          borderWidth: 2.5,
          borderColor: ACCENT,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <Image
          source={{ uri }}
          style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: ACCENT }}
          resizeMode="cover"
        />
      </View>
      {participant.username && (
        <Text style={{ fontSize: 11, color: '#767575', fontFamily: FONT.medium }} numberOfLines={1}>
          {participant.username}
        </Text>
      )}
    </View>
  );
});
