import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import CrystalShape from './ToastCrystal';
import images from '@/constants/images';
import { router } from 'expo-router';

const CreateShardButton = () => {
  return (
    <TouchableOpacity
      onPress={() => {
        router.push('/new-shard');
      }}
      className="my-2 min-w-full flex-1 rounded-2xl bg-background-default p-4 dark:bg-background-dark-paper">
      <View className="flex flex-row items-center gap-1">
        <Image source={images.FractalShard} className="h-8 w-8" resizeMode="contain" />
        <View className="h-[32px] w-[32px] items-center justify-center rounded-xl border-2 border-primary-start color-border-primary">
          <Text className="text-2xl color-border-primary">+</Text>
        </View>

        <View className="ms-2 flex flex-1 flex-col items-start justify-between">
          <Text className="font-ibold text-lg text-text-primary dark:text-text-dark">
            Create a new Shard
          </Text>
          <Text className="font-ilight text-xs text-text-light dark:text-text-dark">
            Enhance your productivity
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default CreateShardButton;
