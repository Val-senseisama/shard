import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  useColorScheme,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useShardStore } from '~/store/shard.store';
import AddImageInput from '~/components/AddImageInput';
import { useAppStore } from '~/store/app.store';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import { GET_SHARD, GET_SIGNED_UPLOAD_URL, GET_FRIENDS } from '~/Graphql/Queries';
import { UPDATE_SHARD } from '~/Graphql/Mutations';
import { useFriendsStore } from '~/store/friends.store';

interface SelectedFriend {
  userId: string;
  role: 'collaborator' | 'accountability_partner';
}

const EditShard = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const { addAlert } = useAppStore();
  const { setFriends } = useFriendsStore();
  const { shards, setShards } = useShardStore();

  // Fetch shard data
  const { data: shardData, loading: shardLoading } = useQuery(GET_SHARD, {
    variables: { id },
    skip: !id,
  });

  // Fetch friends for participant selection
  useQuery(GET_FRIENDS, {
    onCompleted: (data) => {
      if (data?.getFriends?.success) {
        setFriends(data.getFriends.friends);
      }
    },
  });

  const shard = shardData?.getShard?.shard;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedImageUri, setSelectedImageUri] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [selectedParticipants, setSelectedParticipants] = useState<SelectedFriend[]>([]);
  const [showParticipantSelector, setShowParticipantSelector] = useState(false);

  const [fetchSignedUrl] = useLazyQuery(GET_SIGNED_UPLOAD_URL);
  const [updateShardMutation, { loading: saving }] = useMutation(UPDATE_SHARD);

  // Initialize form when shard data loads
  useEffect(() => {
    if (shard) {
      setTitle(shard.title || '');
      setDescription(shard.description || '');
      setUploadedImageUrl(shard.image || null);
      setSelectedParticipants(
        shard.participants?.map((p: any) => ({
          userId: p.user.id,
          role: p.role,
        })) || []
      );
    }
  }, [shard]);

  const uploadImageToCloudinary = async (localUri: string) => {
    try {
      const { data } = await fetchSignedUrl();
      const uploadInfo = data?.getSignedUploadUrl;

      if (!uploadInfo?.success || !uploadInfo?.params) {
        throw new Error('Failed to get signed upload URL');
      }

      const { uploadUrl, params } = uploadInfo;
      const fileName = localUri.split('/').pop() || 'upload.jpg';

      const form = new FormData();
      form.append('file', {
        uri: localUri,
        name: fileName,
        type: 'image/jpeg',
      } as any);
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

      if (result.secure_url) {
        setUploadedImageUrl(result.secure_url);
        addAlert({ str: 'Image uploaded successfully!', type: 'success' });
        return result.secure_url;
      }

      throw new Error('Upload failed');
    } catch (e: any) {
      addAlert({
        str: `Image upload failed: ${e.message}`,
        type: 'error',
      });
      return null;
    }
  };

  const handleSave = async () => {
    if (!title.trim()) {
      addAlert({ str: 'Title is required', type: 'error' });
      return;
    }

    try {
      // Upload image if new image selected
      let finalImageUrl = uploadedImageUrl;
      if (selectedImageUri && !uploadedImageUrl) {
        finalImageUrl = await uploadImageToCloudinary(selectedImageUri);
      }

      const { data } = await updateShardMutation({
        variables: {
          id,
          input: {
            title: title.trim(),
            description: description.trim(),
            image: finalImageUrl,
            participants: selectedParticipants,
          },
        },
      });

      if (data?.updateShard?.success) {
        // Update local store
        const updatedShards = shards.map((s) =>
          s.id === id
            ? {
                ...s,
                title: data.updateShard.shard.title,
                summary: data.updateShard.shard.description,
                image: data.updateShard.shard.image,
              }
            : s
        );
        setShards(updatedShards);

        addAlert({ str: 'Shard updated successfully!', type: 'success' });
        router.back();
      } else {
        addAlert({
          str: data?.updateShard?.message || 'Failed to update shard',
          type: 'error',
        });
      }
    } catch (error) {
      console.error('Update error:', error);
      addAlert({ str: 'Failed to update shard', type: 'error' });
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Shard',
      'Are you sure you want to delete this shard? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // TODO: Implement delete mutation
            addAlert({ str: 'Delete functionality coming soon', type: 'info' });
          },
        },
      ]
    );
  };

  const toggleParticipant = (
    userId: string,
    role: 'collaborator' | 'accountability_partner' | null
  ) => {
    if (!role) {
      setSelectedParticipants((prev) => prev.filter((p) => p.userId !== userId));
    } else {
      setSelectedParticipants((prev) => {
        const filtered = prev.filter((p) => p.userId !== userId);
        return [...filtered, { userId, role }];
      });
    }
  };

  if (shardLoading || !shard) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background-paper dark:bg-background-dark-default">
        <ActivityIndicator size="large" color="#8b5cf6" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background-paper dark:bg-background-dark-default">
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <TouchableOpacity onPress={() => router.back()} hitSlop={20}>
          <Ionicons name="arrow-back" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary dark:text-text-dark">Edit Shard</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={20}>
          {saving ? (
            <ActivityIndicator size="small" color="#3b82f6" />
          ) : (
            <Text className="text-base font-semibold text-blue-500">Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4">
        {/* Image Upload */}
        <View className="mb-4 mt-2">
          <AddImageInput
            initialImage={uploadedImageUrl}
            onImage={(uri) => {
              setSelectedImageUri(uri);
              if (uri) {
                uploadImageToCloudinary(uri);
              }
            }}
          />
        </View>

        {/* Title */}
        <View className="mb-4">
          <Text className="mb-2 text-sm font-medium text-text-primary dark:text-text-dark">
            Title
          </Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Shard title"
            placeholderTextColor={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
            className="rounded-xl border border-gray-300 bg-background-default px-4 py-3 text-base text-text-primary dark:border-gray-700 dark:bg-background-dark-paper dark:text-text-dark"
          />
        </View>

        {/* Description */}
        <View className="mb-4">
          <Text className="mb-2 text-sm font-medium text-text-primary dark:text-text-dark">
            Description
          </Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Describe your shard..."
            placeholderTextColor={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className="rounded-xl border border-gray-300 bg-background-default px-4 py-3 text-base text-text-primary dark:border-gray-700 dark:bg-background-dark-paper dark:text-text-dark"
          />
        </View>

        {/* Participants */}
        <View className="mb-4">
          <View className="mb-2 flex-row items-center justify-between">
            <Text className="text-sm font-medium text-text-primary dark:text-text-dark">
              Participants ({selectedParticipants.length})
            </Text>
            <TouchableOpacity
              onPress={() => setShowParticipantSelector(!showParticipantSelector)}
              className="rounded-lg bg-purple-600 px-3 py-1">
              <Text className="text-xs font-semibold text-white">
                {showParticipantSelector ? 'Done' : 'Manage'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Current Participants */}
          {selectedParticipants.length > 0 && (
            <View className="mb-3 space-y-2">
              {selectedParticipants.map((participant) => {
                const friend = useFriendsStore
                  .getState()
                  .friends.find((f) => f.id === participant.userId);
                return (
                  <View
                    key={participant.userId}
                    className="flex-row items-center justify-between rounded-xl bg-background-default p-3 dark:bg-background-dark-paper">
                    <View className="flex-row items-center">
                      <Image
                        source={{ uri: friend?.profilePic || 'https://via.placeholder.com/40' }}
                        className="mr-3 h-10 w-10 rounded-full bg-gray-200"
                      />
                      <View>
                        <Text className="font-semibold text-text-primary dark:text-text-dark">
                          {friend?.username || participant.userId}
                        </Text>
                        <Text className="dark:text-text-dark-secondary text-xs text-text-secondary">
                          {participant.role === 'collaborator'
                            ? 'Collaborator'
                            : 'Accountability Partner'}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => toggleParticipant(participant.userId, null)}>
                      <Ionicons name="close-circle" size={24} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Participant Selector */}
          {showParticipantSelector && (
            <View className="rounded-xl border border-gray-300 bg-background-default p-4 dark:border-gray-700 dark:bg-background-dark-paper">
              <Text className="mb-3 text-xs font-semibold text-text-primary dark:text-text-dark">
                Add from Friends
              </Text>
              {useFriendsStore
                .getState()
                .friends.filter((f) => !selectedParticipants.some((p) => p.userId === f.id))
                .map((friend) => (
                  <View key={friend.id} className="mb-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-800">
                    <View className="mb-2 flex-row items-center">
                      <Image
                        source={{ uri: friend.profilePic }}
                        className="mr-3 h-10 w-10 rounded-full bg-gray-200"
                      />
                      <Text className="font-semibold text-text-primary dark:text-text-dark">
                        {friend.username}
                      </Text>
                    </View>
                    <View className="flex-row gap-2">
                      <TouchableOpacity
                        onPress={() => toggleParticipant(friend.id, 'collaborator')}
                        className="flex-1 items-center rounded-lg bg-purple-600 py-2">
                        <Text className="text-xs font-semibold text-white">
                          Add as Collaborator
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => toggleParticipant(friend.id, 'accountability_partner')}
                        className="flex-1 items-center rounded-lg bg-blue-600 py-2">
                        <Text className="text-xs font-semibold text-white">Accountability</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
            </View>
          )}
        </View>

        {/* Danger Zone */}
        <View className="mb-8 mt-8 rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-800 dark:bg-red-900/20">
          <Text className="mb-2 text-base font-bold text-red-600 dark:text-red-400">
            Danger Zone
          </Text>
          <Text className="mb-4 text-sm text-red-600 dark:text-red-400">
            Once you delete a shard, there is no going back. Please be certain.
          </Text>
          <TouchableOpacity
            onPress={handleDelete}
            className="items-center rounded-xl bg-red-500 py-3">
            <Text className="font-semibold text-white">Delete Shard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default EditShard;
