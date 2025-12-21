import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  useColorScheme,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '~/store/user.store';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useQuery, useMutation } from '@apollo/client';
import { GET_CHAT, GET_CHAT_MESSAGES } from '~/Graphql/Queries';
import { SEND_MESSAGE, MARK_MESSAGES_READ } from '~/Graphql/Mutations';
import { useAppStore } from '~/store/app.store';
import WebSocketService from '~/helpers/WebSocketService';

interface Message {
  id: string;
  content: string;
  type: string;
  sender: {
    id: string;
    username: string;
    profilePic: string;
  };
  readBy: string[];
  createdAt: string;
}

const ShardChat = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const user = useUserStore((state) => state.user);
  const addAlert = useAppStore((state) => state.addAlert);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch chat details
  const { data: chatData, loading: chatLoading } = useQuery(GET_CHAT, {
    variables: { chatId: id },
    skip: !id,
  });

  // Fetch chat messages (no polling - WebSocket handles real-time)
  const { data: messagesData, loading: messagesLoading, refetch } = useQuery(GET_CHAT_MESSAGES, {
    variables: { chatId: id, limit: 100, skip: 0 },
    skip: !id,
    onCompleted: (data) => {
      if (data?.getChatMessages?.success) {
        setMessages(data.getChatMessages.messages);
        // Mark unread messages as read
        const unreadMessages = data.getChatMessages.messages
          .filter((msg: Message) => !msg.readBy.includes(user?.id || ''))
          .map((msg: Message) => msg.id);
        
        if (unreadMessages.length > 0) {
          markAsRead({ variables: { chatId: id, messageIds: unreadMessages } });
        }
      }
    },
  });

  // Send message mutation
  const [sendMessageMutation, { loading: sending }] = useMutation(SEND_MESSAGE, {
    onCompleted: (data) => {
      if (data?.sendMessage?.success) {
        refetch(); // Refresh messages
        setMessage('');
      } else {
        addAlert({ str: data?.sendMessage?.message || 'Failed to send message', type: 'error' });
      }
    },
    onError: (error) => {
      addAlert({ str: 'Failed to send message', type: 'error' });
      console.error('Send message error:', error);
    },
  });

  // Mark messages as read mutation
  const [markAsRead] = useMutation(MARK_MESSAGES_READ);

  // WebSocket connection and event handlers
  useEffect(() => {
    let mounted = true;

    const setupWebSocket = async () => {
      try {
        await WebSocketService.connect();
        
        if (!mounted || !id) return;

        // Join chat room
        WebSocketService.joinChat(id);

        // Listen for new messages
        const handleNewMessage = (data: any) => {
          if (!mounted) return;
          
          // Add new message to the list
          const newMessage: Message = {
            id: data.id,
            content: data.content,
            type: data.type,
            sender: {
              id: data.sender,
              username: data.senderUsername,
              profilePic: '',
            },
            readBy: [],
            createdAt: data.createdAt,
          };

          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some(msg => msg.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });

          // Mark as read if not from current user
          if (data.sender !== user?.id) {
            markAsRead({ variables: { chatId: id, messageIds: [data.id] } });
          }
        };

        // Listen for typing indicators
        const handleTypingIndicator = (data: any) => {
          if (!mounted || data.userId === user?.id) return;

          setTypingUsers((prev) => {
            if (data.isTyping) {
              return prev.includes(data.username) ? prev : [...prev, data.username];
            } else {
              return prev.filter(u => u !== data.username);
            }
          });
        };

        WebSocketService.onNewMessage(handleNewMessage);
        WebSocketService.onTypingIndicator(handleTypingIndicator);

        // Cleanup
        return () => {
          mounted = false;
          WebSocketService.leaveChat(id);
          WebSocketService.offNewMessage(handleNewMessage);
          WebSocketService.offTypingIndicator(handleTypingIndicator);
        };
      } catch (error) {
        console.error('WebSocket setup error:', error);
      }
    };

    setupWebSocket();

    return () => {
      mounted = false;
    };
  }, [id, user?.id]);

  const handleSend = () => {
    if (!message.trim() || sending) return;

    sendMessageMutation({
      variables: {
        chatId: id,
        content: message.trim(),
        type: 'text',
      },
    });

    // Stop typing indicator
    WebSocketService.sendTypingStop(id);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
  };

  const handleTextChange = (text: string) => {
    setMessage(text);

    // Send typing indicator
    if (text.trim()) {
      WebSocketService.sendTypingStart(id);

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        WebSocketService.sendTypingStop(id);
      }, 2000);
    } else {
      WebSocketService.sendTypingStop(id);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  };

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.sender.id === user?.id;
    const isSystem = item.type === 'system';

    if (isSystem) {
      return (
        <View className="my-2 items-center">
          <Text className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            {item.content}
          </Text>
        </View>
      );
    }

    return (
      <Animated.View
        entering={FadeInDown}
        className={`mb-3 flex-row ${isMe ? 'justify-end' : 'justify-start'}`}>
        {!isMe && (
          <Image
            source={{ uri: item.sender.profilePic || 'https://via.placeholder.com/40' }}
            className="mr-2 h-8 w-8 rounded-full bg-gray-200"
          />
        )}
        <View
          className={`max-w-[75%] rounded-2xl px-4 py-2 ${
            isMe
              ? 'bg-blue-500 rounded-tr-none'
              : 'bg-gray-200 dark:bg-gray-700 rounded-tl-none'
          }`}>
          {!isMe && (
            <Text className="mb-1 text-xs font-bold text-gray-500 dark:text-gray-400">
              {item.sender.username}
            </Text>
          )}
          <Text
            className={`text-base ${
              isMe ? 'text-white' : 'text-text-primary dark:text-text-dark'
            }`}>
            {item.content}
          </Text>
          <Text
            className={`mt-1 text-[10px] ${
              isMe ? 'text-blue-100' : 'text-gray-400'
            } self-end`}>
            {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </Animated.View>
    );
  };

  if (chatLoading || messagesLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background-paper dark:bg-background-dark-default">
        <ActivityIndicator size="large" color="#8b5cf6" />
      </SafeAreaView>
    );
  }

  const chatName = chatData?.getChat?.chat?.shard?.title || 
                   chatData?.getChat?.chat?.name || 
                   'Shard Chat';

  return (
    <SafeAreaView className="flex-1 bg-background-paper dark:bg-background-dark-default">
      {/* Header */}
      <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <TouchableOpacity onPress={() => router.back()} hitSlop={20}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={colorScheme === 'dark' ? '#fff' : '#000'}
          />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-lg font-bold text-text-primary dark:text-text-dark">
            {chatName}
          </Text>
          {chatData?.getChat?.chat?.participants && (
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {chatData.getChat.chat.participants.length} participants
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={() => {}} hitSlop={20}>
          <Ionicons
            name="ellipsis-horizontal"
            size={24}
            color={colorScheme === 'dark' ? '#fff' : '#000'}
          />
        </TouchableOpacity>
      </View>

      {/* Chat Area */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons name="chatbubbles-outline" size={64} color="#9ca3af" />
            <Text className="mt-4 text-center text-gray-500 dark:text-gray-400">
              No messages yet. Start the conversation!
            </Text>
          </View>
        }
      />

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {/* Typing Indicator */}
        {typingUsers.length > 0 && (
          <View className="px-4 py-2">
            <Text className="text-xs italic text-gray-500 dark:text-gray-400">
              {typingUsers.join(', ')} {typingUsers.length === 1 ? 'is' : 'are'} typing...
            </Text>
          </View>
        )}
        
        <View className="flex-row items-center border-t border-gray-200 bg-background-paper p-4 dark:border-gray-800 dark:bg-background-dark-default">
          <TouchableOpacity className="mr-3">
            <Ionicons
              name="add-circle-outline"
              size={28}
              color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
            />
          </TouchableOpacity>
          <View className="flex-1 flex-row items-center rounded-full bg-gray-100 px-4 py-2 dark:bg-gray-800">
            <TextInput
              value={message}
              onChangeText={handleTextChange}
              placeholder="Type a message..."
              placeholderTextColor={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
              className="flex-1 text-base text-text-primary dark:text-text-dark"
              multiline
              editable={!sending}
            />
          </View>
          <TouchableOpacity
            onPress={handleSend}
            disabled={!message.trim() || sending}
            className={`ml-3 items-center justify-center rounded-full p-2 ${
              message.trim() && !sending ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'
            }`}>
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default ShardChat;
