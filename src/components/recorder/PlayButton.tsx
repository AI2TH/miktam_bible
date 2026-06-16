import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../theme';

interface PlayButtonProps {
  uri: string;
}

export function PlayButton({ uri }: PlayButtonProps) {
  const { colors } = useTheme();
  // useAudioPlayer is the new SDK 56 standard for audio playback
  const player = useAudioPlayer(uri);

  const handlePlayPause = () => {
    if (player.playing) {
      player.pause();
    } else {
      player.play();
    }
  };

  return (
    <TouchableOpacity
      style={[styles.btn, { backgroundColor: colors.primary }]}
      onPress={handlePlayPause}
    >
      <Ionicons name={player.playing ? "pause" : "play"} size={20} color={colors.textInverse} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  }
});
