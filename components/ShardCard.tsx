import React from 'react';
import { View, Text, Image } from 'react-native';

interface ShardCardProps {
  title: string;
  summary: string;
  image: string;
  completionRate: number;
}

const ShardCard: React.FC<ShardCardProps> = ({ title, summary, image, completionRate }) => {
  return (
    <View
      className="my-2 flex-row items-center rounded-2xl bg-white p-4 dark:bg-background-dark-paper"
      style={{
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
      }}>
      <Image
        source={{ uri: image }}
        className="h-12 w-12 rounded-xl"
        style={{ marginRight: 12 }}
        resizeMode="cover"
      />
      <View className="flex-1">
        <Text
          className="font-ibold text-base text-text-primary dark:text-text-dark"
          numberOfLines={1}>
          {title}
        </Text>
        <Text className="font-ilight text-xs text-text-light dark:text-text-dark" numberOfLines={1}>
          {summary}
        </Text>
        <View className="mt-2 flex-row items-center">
          <View className="h-2 flex-1 overflow-hidden rounded-full bg-[#e5e7eb] dark:bg-[#22223b]">
            <View
              style={{
                width: `${completionRate}%`,
                backgroundColor: '#6366f1',
                height: '100%',
                borderRadius: 8,
              }}
            />
          </View>
          <Text className="ml-2 font-ibold text-xs text-[#6366f1]">{completionRate}%</Text>
        </View>
      </View>
    </View>
  );
};

export default ShardCard;
