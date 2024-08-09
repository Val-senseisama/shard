import { View, Text, Image, TouchableOpacity } from 'react-native'
import React from 'react'
import images from '../constants/images'
import * as Progress from "react-native-progress";
import icons from '../constants/icons';
import { useThemeContext } from '../ThemeProviderContext';
import { router } from 'expo-router';


const ShardCard = ({shard: { image, title, description, progress, handlePress },
}) => {
  const { theme } = useThemeContext();
  
  return (
    <View
      style={{ backgroundColor: theme.colors.primary }}
      className="w-[84vw] mx-4 my-4 py-4 px-1  rounded-3xl">
      <TouchableOpacity
      onPress={handlePress}
      >
        <View className="flex-row px-2">
          <Image source={icons.smallShard} className="mt-2" />
          <Image
            source={image}
            className="w-[46px] h-[46px] ml-2"
            resizeMode="cover"
          />
          <View className="">
            <Text
              style={{ color: theme.colors.text }}
              className="text-base font-Iregular flex-shrink text-black-100 ml-2 my-1">
              {title.length > 20 ? title.slice(0, 22) + "..." : title}
            </Text>
            <Text
              style={{ color: theme.colors.text }}
              className="text-xs ml-3 font-Iregular flex-shrink text-black-100">
              {description.length > 30
                ? description.slice(0, 30) + ".."
                : description}
            </Text>
          </View>
        </View>
        {progress && (
          <View className="flex-row items-center">
            <Progress.Bar
              color="#4135F3"
              progress={progress}
              width={150}
              unfilledColor="#DEE1EF"
              borderWidth={0}
              className="mx-4 my-2"
            />
            <Text
              style={{ color: theme.colors.text }}
              className="text-xs font-Iregular text-black-100">
              {progress * 100}%
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default ShardCard