import React, { SetStateAction, useRef, useState, useEffect } from 'react';
import { Image, Modal, Pressable, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { captureRef } from 'react-native-view-shot';
import Session from '@/helpers/Session';
import icons from '@/constants/icons';
import * as FileSystem from 'expo-file-system';
import { useAppStore } from '~/store/app.store';

const AddImageInput = ({
  onImage,
  initialImage,
  /**
   * `square` is the avatar case (profile pictures) — a 96pt tile, cropped 1:1.
   *
   * `banner` is for a quest's hero image. That image is rendered full-bleed and
   * 280pt tall on the quest screen, so previewing it in the 96pt avatar tile
   * showed a thumbnail far smaller than the thing being edited, and the 1:1 crop
   * disagreed with the wide frame it actually lands in.
   */
  shape = 'square',
}: {
  onImage: (uri: string) => void;
  initialImage?: string | null;
  shape?: 'square' | 'banner';
}) => {
  const isBanner = shape === 'banner';
  const { addAlert } = useAppStore();
  const [imageUri, setImageUri] = useState<string | null>(initialImage || null);
  const [isModalVisible, setModalVisible] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const imageRef = useRef(null);

  // Update imageUri when initialImage prop changes
  useEffect(() => {
    if (initialImage) {
      setImageUri(initialImage);
    }
  }, [initialImage]);

  // Function to pick an image
  const pickImage = async () => {
    // Request permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    console.log('Permission result:', permissionResult);

    if (permissionResult.status !== 'granted') {
      addAlert({
        str: 'Permission required. You need to allow access to your gallery.',
        type: 'error',
      });
      return;
    }

    try {
      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], // Updated from deprecated MediaTypeOptions
        allowsEditing: true,
        // Crop to the shape it will actually be shown in.
        aspect: isBanner ? [16, 9] : [1, 1],
        quality: 1,
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImageUri(result.assets[0].uri);
        setIsImageLoaded(false);
        setModalVisible(true);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      addAlert({
        str: 'Failed to open image picker. Please try again.',
        type: 'error',
      });
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
    <View className={isBanner ? 'mt-5 w-full' : 'mt-5 items-center'}>
      {/* Image / Placeholder */}
      <TouchableOpacity onPress={pickImage} className={isBanner ? 'w-full' : undefined}>
        <View
          className={
            isBanner
              ? 'w-full items-center justify-center overflow-hidden rounded-xl border border-primary-start'
              : 'h-24 w-24 items-center justify-center overflow-hidden rounded-md border border-primary-start'
          }
          style={isBanner ? { aspectRatio: 16 / 9 } : undefined}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} className="h-full w-full" resizeMode="cover" />
          ) : (
            <Image
              source={icons.addImage}
              className={isBanner ? 'h-12 w-12' : 'h-[50%] w-[50%]'}
              resizeMode="contain"
            />
          )}
        </View>
      </TouchableOpacity>

      {/* Change Image Button */}
      {imageUri && (
        <TouchableOpacity onPress={pickImage} className={isBanner ? 'mt-3 self-center' : 'mt-3'}>
          <Text className="text-blue-500">Change Image</Text>
        </TouchableOpacity>
      )}
      {!imageUri && (
        <Text className="my-2 text-center font-ithin text-xs text-text-light dark:text-text-dark">
          Add an image
        </Text>
      )}
      {/* Crop Modal */}
      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View className="flex-1 items-center justify-center bg-black/70">
          <View className={isBanner ? 'w-11/12 rounded-lg bg-white p-4' : 'h-80 w-80 rounded-lg bg-white p-4'}>
            {/* The captured region IS the crop, so it has to be the same shape as
                the final frame — a square capture box would hand back a square
                image for a banner slot. */}
            <View
              className="w-full items-center justify-center"
              style={isBanner ? { aspectRatio: 16 / 9 } : { flex: 1 }}>
              {imageUri && (
                <View ref={imageRef} collapsable={false} className="h-full w-full">
                  <Image
                    source={{ uri: imageUri }}
                    className="h-full w-full rounded-lg"
                    resizeMode="cover"
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
