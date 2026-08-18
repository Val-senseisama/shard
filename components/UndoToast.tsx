import React from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';

const { width } = Dimensions.get('window');

interface UndoToastProps {
  text1?: string;
  props: {
    onUndo: () => void;
    uuid?: string;
    /**
     * Icon, tint and subtitle, for callers that aren't deletions.
     *
     * This component was written for one case and hardcoded a red trash icon
     * and "Tap undo to restore". A catch-up is the opposite kind of event —
     * work marked DONE — and announcing it in delete-red would read as though
     * something had been thrown away. Defaults are unchanged, so existing
     * behaviour is untouched.
     */
    icon?: keyof typeof Ionicons.glyphMap;
    tint?: string;
    subtitle?: string;
  };
}

const UndoToast: React.FC<UndoToastProps> = ({ text1, props }) => {
  const tint = props.tint ?? '#ef4444';
  const icon = props.icon ?? 'trash-outline';

  return (
    <View
      className="mx-4 mb-4 flex-row items-center justify-between overflow-hidden rounded-xl bg-gray-900 p-4 shadow-lg dark:bg-gray-800"
      style={{
        width: width - 32,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        borderLeftWidth: 4,
        borderLeftColor: tint,
      }}>
      <View className="flex-1 flex-row items-center gap-3">
        <View
          className="flex h-8 w-8 items-center justify-center rounded-full"
          style={{ backgroundColor: `${tint}33` }}>
          <Ionicons name={icon} size={18} color={tint} />
        </View>
        <View className="flex-1">
          <Text className="font-medium text-white" numberOfLines={1}>
            {text1 || 'Item deleted'}
          </Text>
          <Text className="text-xs text-gray-400">
            {props.subtitle ?? 'Tap undo to restore'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => {
          if (props.onUndo) props.onUndo();
          Toast.hide();
        }}
        className="ml-4 flex-row items-center gap-1 rounded-md bg-gray-700 px-3 py-2 active:bg-gray-600">
        <Ionicons name="arrow-undo" size={16} color="#60a5fa" />
        <Text className="font-semibold text-blue-400">Undo</Text>
      </TouchableOpacity>
    </View>
  );
};

export default UndoToast;
