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
  };
}

const UndoToast: React.FC<UndoToastProps> = ({ text1, props }) => {
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
        borderLeftColor: '#ef4444',
      }}>
      <View className="flex-1 flex-row items-center gap-3">
        <View className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/20">
          <Ionicons name="trash-outline" size={18} color="#ef4444" />
        </View>
        <View>
          <Text className="font-medium text-white">{text1 || 'Item deleted'}</Text>
          <Text className="text-xs text-gray-400">Tap undo to restore</Text>
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
