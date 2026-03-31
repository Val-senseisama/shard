import React from 'react';
import { View, Text, Modal, Pressable, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import AnimatedPressable from './AnimatedPressable';

interface ConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: string;
  iconColor?: string;
  confirmColor?: string;
  destructive?: boolean;
}

const ConfirmModal = ({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  icon,
  iconColor,
  confirmColor,
  destructive = false,
}: ConfirmModalProps) => {
  const isDark = useColorScheme() === 'dark';

  const accentColor = confirmColor || (destructive ? '#ef4444' : '#8b5cf6');
  const resolvedIcon = icon || (destructive ? 'warning-outline' : 'help-circle-outline');
  const resolvedIconColor = iconColor || accentColor;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable className="flex-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} onPress={onClose}>
        <View className="flex-1 items-center justify-center px-6">
          <Pressable onPress={(e) => e.stopPropagation()}>
            <Animated.View
              entering={SlideInDown.springify().damping(20).stiffness(200)}
              style={{
                width: '100%',
                maxWidth: 340,
                backgroundColor: isDark ? '#1a1a1a' : '#fff',
                borderRadius: 24,
                borderWidth: 1,
                borderColor: isDark ? 'rgba(72,72,71,0.15)' : 'rgba(0,0,0,0.06)',
                overflow: 'hidden',
              }}>
              <View className="items-center px-6 pt-8 pb-5">
                {/* Icon */}
                <View
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    backgroundColor: `${accentColor}15`,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 16,
                  }}>
                  <Ionicons name={resolvedIcon as any} size={28} color={resolvedIconColor} />
                </View>

                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: isDark ? '#fff' : '#1a1a1a',
                    textAlign: 'center',
                    marginBottom: 8,
                  }}>
                  {title}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: isDark ? '#767575' : '#9ca3af',
                    textAlign: 'center',
                    lineHeight: 20,
                  }}>
                  {message}
                </Text>
              </View>

              {/* Actions */}
              <View style={{ paddingHorizontal: 20, paddingBottom: 20, gap: 10 }}>
                <AnimatedPressable onPress={onConfirm} scaleDown={0.97}>
                  <View
                    style={{
                      borderRadius: 14,
                      paddingVertical: 14,
                      alignItems: 'center',
                      backgroundColor: accentColor,
                    }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>
                      {confirmLabel}
                    </Text>
                  </View>
                </AnimatedPressable>

                <AnimatedPressable onPress={onClose} scaleDown={0.97}>
                  <View
                    style={{
                      borderRadius: 14,
                      paddingVertical: 14,
                      alignItems: 'center',
                      backgroundColor: isDark ? '#262626' : '#f3f4f6',
                    }}>
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '600',
                        color: isDark ? '#fff' : '#1a1a1a',
                      }}>
                      {cancelLabel}
                    </Text>
                  </View>
                </AnimatedPressable>
              </View>
            </Animated.View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
};

export default ConfirmModal;
