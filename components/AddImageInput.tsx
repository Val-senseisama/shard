import React, { SetStateAction, useRef, useState } from 'react';
import { Image, Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { captureRef } from 'react-native-view-shot';
import Session from '@/helpers/Session';
import icons from '@/constants/icons';
import * as FileSystem from 'expo-file-system';
import { useAppStore } from '~/store/app.store';

const AddImageInput = ({ onImage }: { onImage: (uri: string) => void }) => {
  const { addAlert } = useAppStore()
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const imageRef = useRef(null);

  // Function to pick an image
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.status !== 'granted') {
      addAlert({
        str: 'Permission required, You need to allow access to your gallery.',
        type: 'error',
      });
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
      setIsImageLoaded(false);
      setModalVisible(true);
    }
  };

  // Function to capture the cropped image
  const cropImage = async () => {
    if (!imageRef.current || !isImageLoaded) {
      console.error('Image not ready for capture');
      return;
    }

    try {
      const croppedUri = await captureRef(imageRef.current, {
        format: 'jpg',
        quality: 0.9,
        result: 'tmpfile',
      });

      console.log('Cropped image URI:', croppedUri);
      // Set the image URI and notify parent component
      setImageUri(croppedUri);
      onImage(croppedUri);
      setModalVisible(false);
    } catch (error) {
      console.error('Error capturing image:', error);
      addAlert({
        str: 'Failed to crop image. Please try again.',
        type: 'error',
      });
    }
  };

  return (
    <View className="mt-5 items-center">
      {/* Profile Image / Placeholder */}
      <TouchableOpacity onPress={pickImage}>
        <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-md border border-primary-start">
          {imageUri ? (
            <Image source={{ uri: imageUri }} className="h-full w-full" />
          ) : (
            <Image source={icons.addImage} className="h-[50%] w-[50%]" resizeMode="contain" />
          )}
        </View>
      </TouchableOpacity>

      {/* Change Image Button */}
      {imageUri && (
        <TouchableOpacity onPress={pickImage} className="mt-3">
          <Text className="text-blue-500">Change Image</Text>
        </TouchableOpacity>
      )}
      <Text className="my-2 text-center font-ithin text-xs text-text-light dark:text-text-dark">
        Add an image
      </Text>
      {/* Crop Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View className="flex-1 items-center justify-center bg-black/70">
          <View className="h-80 w-80 rounded-lg bg-white p-4">
            <View className="h-full w-full items-center justify-center">
              {imageUri && (
                <View ref={imageRef} collapsable={false} className="h-full w-full">
                  <Image
                    source={{ uri: imageUri }}
                    className="h-full w-full rounded-full"
                    onLoad={() => setIsImageLoaded(true)}
                  />
                </View>
              )}
            </View>
            <View className="mt-3 flex-row justify-between">
              <Pressable
                onPress={() => setModalVisible(false)}
                className="mr-2 flex-1 rounded bg-gray-500 p-2">
                <Text className="text-center text-white">Cancel</Text>
              </Pressable>
              <Pressable
                onPress={cropImage}
                className="ml-2 flex-1 rounded bg-blue-500 p-2"
                disabled={!isImageLoaded}>
                <Text className="text-center text-white">Crop & Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default AddImageInput;
