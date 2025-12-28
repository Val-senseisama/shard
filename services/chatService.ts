import * as ImagePicker from 'expo-image-picker';
import { ApolloClient } from '@apollo/client';
import { GET_SIGNED_UPLOAD_URL } from '~/Graphql/Queries';
import { SEND_MESSAGE } from '~/Graphql/Mutations';

/**
 * Upload media to Cloudinary using signed upload
 */
export const uploadMediaToCloudinary = async (
  localUri: string,
  fetchSignedUrl: () => Promise<any>
): Promise<string | null> => {
  try {
    console.log('Starting media upload...');
    const { data } = await fetchSignedUrl();
    const uploadInfo = data?.getSignedUploadUrl;

    if (!uploadInfo?.success || !uploadInfo?.params) {
      throw new Error('Failed to get signed upload URL');
    }

    const { uploadUrl, params } = uploadInfo;
    const fileName = localUri.split('/').pop() || 'upload.jpg';

    const form = new FormData();

    // Add the file first
    form.append('file', {
      uri: localUri,
      name: fileName,
      type: 'image/jpeg',
    } as any);

    // Add Cloudinary required parameters
    form.append('api_key', params.apiKey);
    form.append('timestamp', params.timestamp.toString());
    form.append('signature', params.signature);
    form.append('public_id', params.publicId);
    form.append('folder', params.folder);

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: form,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    const result = await response.json();
    console.log('Upload result:', result);

    if (result.secure_url) {
      return result.secure_url;
    }

    if (result.error) {
      throw new Error(result.error.message || 'Upload failed');
    }

    throw new Error('Upload failed - no secure_url in response');
  } catch (e: any) {
    console.error('Media upload error:', e);
    throw e;
  }
};

/**
 * Open image picker and return selected image URI
 */
export const pickMediaFromGallery = async (): Promise<string | null> => {
  try {
    // Request permission
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissionResult.status !== 'granted') {
      throw new Error('Permission required to access your gallery');
    }

    // Launch image picker with system crop
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true, // Uses system crop UI
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      return result.assets[0].uri;
    }

    return null;
  } catch (error) {
    console.error('Image picker error:', error);
    throw error;
  }
};

/**
 * Send a chat message with optional media
 */
export const sendChatMessage = async (
  chatId: string,
  content: string,
  mediaUri: string | null,
  sendMessageMutation: any,
  fetchSignedUrl: () => Promise<any>
): Promise<void> => {
  let mediaUrl = null;
  let messageType = 'text';
  let messageContent = content.trim();

  // Upload media if selected
  if (mediaUri) {
    mediaUrl = await uploadMediaToCloudinary(mediaUri, fetchSignedUrl);

    if (!mediaUrl) {
      throw new Error('Failed to upload media');
    }

    messageType = 'image';
    // If no text message, use a default caption
    if (!messageContent) {
      messageContent = '📷 Image';
    }
  }

  await sendMessageMutation({
    variables: {
      chatId,
      content: messageContent,
      type: messageType,
      ...(mediaUrl && { attachments: [{ url: mediaUrl, type: 'image' }] }),
    },
  });
};
