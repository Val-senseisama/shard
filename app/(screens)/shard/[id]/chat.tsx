import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { brand, FONT, RADIUS } from '~/components/hud';
import { useColorScheme } from '~/hooks/useColorScheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { useUserStore } from '~/store/user.store';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOutDown,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { useReducedMotion } from '~/helpers/motion';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Animated as RNAnimated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client';
import { GET_CHAT, GET_CHAT_MESSAGES, GET_SIGNED_UPLOAD_URL } from '~/Graphql/Queries';
import {
  SEND_MESSAGE,
  MARK_MESSAGES_READ,
  REMOVE_SHARD_PARTICIPANT,
  CREATE_POLL,
  VOTE_POLL,
  SUMMON_SUMMARY,
  ADD_REACTION,
  REMOVE_REACTION,
  EDIT_MESSAGE,
  DELETE_MESSAGE,
} from '~/Graphql/Mutations';
import { useAppStore } from '~/store/app.store';
import WebSocketService from '~/helpers/WebSocketService';
import { pickMediaFromGallery, uploadMediaToCloudinary } from '~/services/chatService';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import ConfirmModal from '~/components/ConfirmModal';
import AnimatedPressable from '~/components/AnimatedPressable';
import MiniTaskAssignmentCard from '~/components/MiniTaskAssignmentCard';

// ─── Chat skeleton ────────────────────────────────────────────────────────────

const BubbleSkeleton = ({ isMe, width, isDark }: { isMe: boolean; width: string; isDark: boolean }) => {
  const opacity = useSharedValue(0.3);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    // Decorative loop — hold still when the user asked for less motion.
    if (reducedMotion) return;
    opacity.value = withRepeat(
      withSequence(withTiming(0.7, { duration: 900 }), withTiming(0.3, { duration: 900 })),
      -1,
      true
    );
  }, [reducedMotion]);
  const anim = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const bg = isDark ? '#2a2a2a' : '#e5e7eb';
  return (
    <View style={{ flexDirection: 'row', justifyContent: isMe ? 'flex-end' : 'flex-start', marginBottom: 12, paddingHorizontal: 16 }}>
      {!isMe && <Animated.View style={[{ width: 32, height: 32, borderRadius: 16, backgroundColor: bg, marginRight: 8 }, anim]} />}
      <Animated.View style={[{ height: 36, width: width as any, borderRadius: 18, backgroundColor: bg }, anim]} />
    </View>
  );
};

const ChatSkeleton = ({ isDark }: { isDark: boolean }) => (
  <View style={{ flex: 1, paddingTop: 12 }}>
    <BubbleSkeleton isMe={false} width="55%" isDark={isDark} />
    <BubbleSkeleton isMe={true}  width="40%" isDark={isDark} />
    <BubbleSkeleton isMe={false} width="70%" isDark={isDark} />
    <BubbleSkeleton isMe={false} width="45%" isDark={isDark} />
    <BubbleSkeleton isMe={true}  width="60%" isDark={isDark} />
    <BubbleSkeleton isMe={true}  width="35%" isDark={isDark} />
    <BubbleSkeleton isMe={false} width="50%" isDark={isDark} />
    <BubbleSkeleton isMe={true}  width="65%" isDark={isDark} />
  </View>
);

// ─── Typing dots ──────────────────────────────────────────────────────────────

const TypingDot = ({ delay }: { delay: number }) => {
  const y = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    // The bounce is decorative, but the dots themselves carry meaning ("someone
    // is typing") — so with motion off they stay put and stay visible.
    if (reducedMotion) return;
    y.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-5, { duration: 300 }),
          withTiming(0, { duration: 300 }),
          withTiming(0, { duration: 400 })
        ),
        -1,
        false
      )
    );
  }, [reducedMotion]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  return (
    // 3.5 is half of 7 — a circle, not a token.
    <Animated.View style={[{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: brand.violet }, style]} />
  );
};

const TypingIndicator = ({ users }: { users: string[] }) => (
  <Animated.View
    entering={FadeIn.duration(200)}
    exiting={FadeOutDown.duration(150)}
    style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 6 }}>
    <View style={{
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: 'rgba(139,92,246,0.1)', borderRadius: RADIUS.md,
      paddingHorizontal: 12, paddingVertical: 8,
    }}>
      <TypingDot delay={0} />
      <TypingDot delay={150} />
      <TypingDot delay={300} />
    </View>
    <Text style={{ fontSize: 11, color: brand.violet, fontFamily: FONT.medium }}>
      {users.join(', ')} {users.length === 1 ? 'is' : 'are'} typing
    </Text>
  </Animated.View>
);

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  content: string;
  type: string;
  mediaUrl?: string;
  deleted?: boolean;
  edited?: boolean;
  editedAt?: string;
  replyTo?: string;
  reactions?: { userId: string; emoji: string }[];
  sender: { id: string; username: string; profilePic: string };
  readBy: string[];
  createdAt: string;
  sendStatus?: 'pending' | 'sent' | 'failed';
  mentions?: string[];
  poll?: {
    question: string;
    options: { text: string; votes: { id: string; username?: string }[] }[];
    multipleAnswers: boolean;
  };
  minitaskRef?: {
    miniGoalId: string;
    taskId: string;
    miniGoalTitle?: string | null;
    taskTitle?: string | null;
    assignedTo: { id: string; username: string; profilePic?: string };
  };
}

const formatTime = (val: any): string => {
  if (!val) return '';
  const d = val instanceof Date ? val : new Date(typeof val === 'number' ? val : val);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ─── AudioMessagePlayer ───────────────────────────────────────────────────────
// Self-contained so each message owns its playback state independently

const AudioMessagePlayer = memo(
  ({
    audioSrc,
    isMe,
    colorScheme,
  }: {
    audioSrc: string;
    isMe: boolean;
    colorScheme: string | null | undefined;
  }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const soundRef = useRef<Audio.Sound | null>(null);

    useEffect(() => {
      return () => {
        soundRef.current?.unloadAsync().catch(() => {});
      };
    }, []);

    const BARS = [0.4, 0.7, 0.5, 1, 0.6, 0.8, 0.3, 0.9, 0.5, 0.7, 0.4, 0.8, 0.6, 1, 0.5];

    const fmtDur = (s: number) =>
      `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

    const handlePlay = async () => {
      if (isPlaying) {
        await soundRef.current?.pauseAsync();
        setIsPlaying(false);
        return;
      }
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }
      const { sound } = await Audio.Sound.createAsync(
        { uri: audioSrc },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          const dur = (status.durationMillis ?? 0) / 1000;
          const pos = (status.positionMillis ?? 0) / 1000;
          setDuration(dur);
          setProgress(dur > 0 ? pos / dur : 0);
          if (status.didJustFinish) {
            setIsPlaying(false);
            setProgress(0);
          }
        }
      );
      soundRef.current = sound;
      setIsPlaying(true);
    };

    const remaining = duration > 0 ? duration - progress * duration : 0;

    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, minWidth: 180 }}>
        <TouchableOpacity
          onPress={handlePlay}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: isMe ? 'rgba(255,255,255,0.25)' : '#3b82f6',
            alignItems: 'center',
            justifyContent: 'center',
          }} accessibilityRole="button" accessibilityLabel={isPlaying ? 'Pause' : 'Play'}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={18} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2, height: 32 }}>
          {BARS.map((h, i) => {
            const filled = i / BARS.length <= progress;
            return (
              <View
                key={i}
                style={{
                  flex: 1,
                  height: `${h * 100}%`,
                  borderRadius: RADIUS.xs,
                  backgroundColor: filled
                    ? isMe ? '#fff' : '#3b82f6'
                    : isMe ? 'rgba(255,255,255,0.35)' : colorScheme === 'dark' ? '#4b5563' : '#d1d5db',
                }}
              />
            );
          })}
        </View>
        <Text style={{ fontSize: 11, color: isMe ? 'rgba(255,255,255,0.8)' : '#6b7280', minWidth: 32 }}>
          {fmtDur(remaining)}
        </Text>
      </View>
    );
  }
);

// ─── SwipeableMessage ────────────────────────────────────────────────────────
// Swipe right on any message to set it as reply target, exactly like WhatsApp.

const REPLY_THRESHOLD = 65;

const SwipeableMessage = memo(
  ({ onSwipeReply, children }: { onSwipeReply: () => void; children: React.ReactNode }) => {
    const translateX = useSharedValue(0);
    const triggered = useSharedValue(false);

    const triggerReply = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onSwipeReply();
    };

    const panGesture = Gesture.Pan()
      .activeOffsetX([8, 9999])   // activate only on rightward swipe
      .failOffsetY([-12, 12])     // cancel when scrolling vertically
      .onUpdate((e) => {
        if (e.translationX <= 0) return;
        // rubber-band resistance after threshold
        translateX.value =
          e.translationX > REPLY_THRESHOLD
            ? REPLY_THRESHOLD + (e.translationX - REPLY_THRESHOLD) * 0.15
            : e.translationX;
        if (!triggered.value && e.translationX >= REPLY_THRESHOLD) {
          triggered.value = true;
          runOnJS(triggerReply)();
        }
      })
      .onEnd(() => {
        translateX.value = withSpring(0, { damping: 18, stiffness: 250 });
        triggered.value = false;
      });

    const bubbleStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translateX.value }],
    }));

    const iconStyle = useAnimatedStyle(() => {
      const progress = Math.min(translateX.value / REPLY_THRESHOLD, 1);
      return {
        opacity: progress,
        transform: [{ scale: 0.4 + 0.6 * progress }],
      };
    });

    return (
      <GestureDetector gesture={panGesture}>
        <View>
          {/* Reply icon sits behind the sliding bubble */}
          <Animated.View
            style={[
              {
                position: 'absolute',
                left: 10,
                top: 0,
                bottom: 0,
                justifyContent: 'center',
                zIndex: 0,
              },
              iconStyle,
            ]}>
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: 'rgba(139,92,246,0.15)',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Ionicons name="arrow-undo-outline" size={16} color="#8b5cf6" />
            </View>
          </Animated.View>
          {/* Bubble slides right on swipe */}
          <Animated.View style={[bubbleStyle, { zIndex: 1 }]}>
            {children}
          </Animated.View>
        </View>
      </GestureDetector>
    );
  }
);

// ─── Main component ───────────────────────────────────────────────────────────

const ShardChat = () => {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const user = useUserStore((state) => state.user);
  const addAlert = useAppStore((state) => state.addAlert);

  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [selectedMediaUri, setSelectedMediaUri] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isAttachmentMenuOpen, setIsAttachmentMenuOpen] = useState(false);
  const [reactionTarget, setReactionTarget] = useState<{ message: Message; isMe: boolean } | null>(null);
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  // Ref so renderItem can look up original messages without being in its dep array
  const messagesRef = useRef<Message[]>([]);
  // Track IDs from the initial fetch — only animate messages not in this set
  const initialMessageIdsRef = useRef<Set<string>>(new Set());
  const initialLoadDoneRef = useRef(false);

  // Recording state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const waveAnim = useRef(new RNAnimated.Value(0)).current;

  const flatListRef = useRef<FlatList>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Queries ────────────────────────────────────────────────────────────

  const { data: chatData, loading: chatLoading } = useQuery(GET_CHAT, {
    variables: { chatId: id },
    skip: !id,
    fetchPolicy: 'cache-and-network', // always reflect participant changes
  });

  // fetchPolicy: 'network-only' guarantees data arrives even when Apollo has
  // a broken cache entry (e.g. old poll messages with null question).
  // onCompleted is intentionally avoided — it silently skips when there are
  // partial GraphQL errors. Reading `data` via useEffect is reliable.
  const { data: messagesData, loading: messagesLoading } = useQuery(GET_CHAT_MESSAGES, {
    variables: { chatId: id, limit: 100, skip: 0 },
    skip: !id,
    fetchPolicy: 'network-only',
    errorPolicy: 'all', // return partial data even when some fields error
  });

  useEffect(() => {
    const msgs: Message[] = messagesData?.getChatMessages?.messages ?? [];
    if (!msgs.length && !messagesData?.getChatMessages?.success) return;
    setMessages(msgs);
    setNextCursor(messagesData?.getChatMessages?.nextCursor ?? null);
    setHasMore(messagesData?.getChatMessages?.hasMore ?? false);

    // Stamp initial IDs so renderItem skips enter animation for historical messages
    if (!initialLoadDoneRef.current) {
      initialMessageIdsRef.current = new Set(msgs.map((m) => m.id));
      initialLoadDoneRef.current = true;
    }

    const unread = msgs
      .filter((msg) => !msg.readBy.includes(user?.id || ''))
      .map((msg) => msg.id);
    if (unread.length > 0) {
      markAsRead({ variables: { chatId: effectiveChatIdRef.current, messageIds: unread } });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messagesData]);

  // Separate lazy query for pagination — never touches messagesData so WS
  // messages added to state are not overwritten by the refetch.
  const [fetchMoreMessages] = useLazyQuery(GET_CHAT_MESSAGES, {
    fetchPolicy: 'network-only',
  });

  const [fetchSignedUrl] = useLazyQuery(GET_SIGNED_UPLOAD_URL);

  // ─── Mutations ───────────────────────────────────────────────────────────

  const [sendMessageMutation, { loading: sending }] = useMutation(SEND_MESSAGE, {
    onError: () => addAlert({ str: 'Failed to send message', type: 'error' }),
  });
  const [markAsRead] = useMutation(MARK_MESSAGES_READ);
  const [createPollMutation] = useMutation(CREATE_POLL);
  const [summonSummaryMutation] = useMutation(SUMMON_SUMMARY);
  const [removeShardParticipant] = useMutation(REMOVE_SHARD_PARTICIPANT);
  const [votePollMutation] = useMutation(VOTE_POLL);
  const [addReactionMutation] = useMutation(ADD_REACTION);
  const [removeReactionMutation] = useMutation(REMOVE_REACTION);
  const [editMessageMutation] = useMutation(EDIT_MESSAGE);
  const [deleteMessageMutation] = useMutation(DELETE_MESSAGE);

  // Resolve the actual chat document ID from chatData.
  // The URL param `id` is the SHARD ID; the chat document has a different _id.
  // Everything that hits the WS room or DB must use the actual chat ID.
  const actualChatId = chatData?.getChat?.chat?.id;
  const effectiveChatIdRef = useRef<string>(id);
  useEffect(() => {
    effectiveChatIdRef.current = actualChatId || id;
  }, [actualChatId, id]);

  // ─── WS room join — switch from shard ID to actual chat ID once known ────

  useEffect(() => {
    if (!actualChatId) return;
    // Leave the shard-ID room (may have joined before chatData loaded),
    // then join the correct room so server emits are received.
    WebSocketService.leaveChat(id);
    WebSocketService.joinChat(actualChatId);
    return () => WebSocketService.leaveChat(actualChatId);
  }, [actualChatId, id]);

  // ─── WebSocket event handlers ─────────────────────────────────────────────

  useEffect(() => {
    let mounted = true;

    const setupWebSocket = async () => {
      try {
        await WebSocketService.connect();
        if (!mounted || !id) return;

        // Initial join with shard ID — the effect above upgrades to actual chat ID
        WebSocketService.joinChat(id);

        const handleNewMessage = (data: any) => {
          if (!mounted) return;
          setMessages((prev) => {
            const optimisticIdx = prev.findIndex(
              (m) => m.id.startsWith('temp-') && m.content === data.content && m.type === data.type
            );
            if (optimisticIdx !== -1) {
              const next = [...prev];
              next[optimisticIdx] = { ...next[optimisticIdx], id: data.id, sendStatus: 'sent' };
              return next;
            }
            if (prev.some((m) => m.id === data.id)) return prev;
            return [
              ...prev,
              {
                id: data.id,
                content: data.content,
                type: data.type,
                mediaUrl: data.mediaUrl,
                replyTo: data.replyTo,
                sender: { id: data.sender, username: data.senderUsername, profilePic: data.senderProfilePic || '' },
                readBy: [],
                createdAt: data.createdAt,
              },
            ];
          });
          if (data.sender !== user?.id) {
            markAsRead({ variables: { chatId: effectiveChatIdRef.current, messageIds: [data.id] } });
          }
        };

        const handleTypingIndicator = (data: any) => {
          if (!mounted || data.userId === user?.id) return;
          setTypingUsers((prev) =>
            data.isTyping
              ? prev.includes(data.username) ? prev : [...prev, data.username]
              : prev.filter((u) => u !== data.username)
          );
        };

        const handleMessageDeleted = ({ messageId }: { messageId: string }) => {
          if (!mounted) return;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === messageId ? { ...m, content: '[Message deleted]', deleted: true } : m
            )
          );
        };

        const handleMessageEdited = ({ messageId, content }: { messageId: string; content: string }) => {
          if (!mounted) return;
          setMessages((prev) =>
            prev.map((m) => (m.id === messageId ? { ...m, content, edited: true } : m))
          );
        };

        const handleMessageReaction = ({ messageId, userId, emoji }: any) => {
          if (!mounted) return;
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== messageId) return m;
              const reactions = (m.reactions || []).filter((r) => r.userId !== userId);
              return { ...m, reactions: [...reactions, { userId, emoji }] };
            })
          );
        };

        const handleMessageReactionRemoved = ({ messageId, userId, emoji }: any) => {
          if (!mounted) return;
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== messageId) return m;
              return {
                ...m,
                reactions: (m.reactions || []).filter(
                  (r) => !(r.userId === userId && r.emoji === emoji)
                ),
              };
            })
          );
        };

        const handlePollVoted = ({ messageId, options }: any) => {
          if (!mounted) return;
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== messageId || !m.poll) return m;
              return {
                ...m,
                poll: {
                  ...m.poll,
                  options: options.map((opt: any) => ({
                    text: opt.text,
                    votes: opt.votes.map((v: string) => ({ id: v })),
                  })),
                },
              };
            })
          );
        };

        WebSocketService.onNewMessage(handleNewMessage);
        WebSocketService.onTypingIndicator(handleTypingIndicator);
        WebSocketService.onMessageDeleted(handleMessageDeleted);
        WebSocketService.onMessageEdited(handleMessageEdited);
        WebSocketService.onMessageReaction(handleMessageReaction);
        WebSocketService.onMessageReactionRemoved(handleMessageReactionRemoved);
        WebSocketService.onPollVoted(handlePollVoted);

        return () => {
          mounted = false;
          WebSocketService.leaveChat(id);
          WebSocketService.offNewMessage(handleNewMessage);
          WebSocketService.offTypingIndicator(handleTypingIndicator);
          WebSocketService.offMessageDeleted(handleMessageDeleted);
          WebSocketService.offMessageEdited(handleMessageEdited);
          WebSocketService.offMessageReaction(handleMessageReaction);
          WebSocketService.offMessageReactionRemoved(handleMessageReactionRemoved);
          WebSocketService.offPollVoted(handlePollVoted);
        };
      } catch (error) {
        console.error('WebSocket setup error:', error);
      }
    };

    const cleanup = setupWebSocket();
    return () => {
      mounted = false;
      cleanup.then((fn) => fn?.());
    };
  }, [id, user?.id]);

  // Keep ref in sync so renderItem can look up quoted messages without deps
  useEffect(() => { messagesRef.current = messages; }, [messages]);

  // ─── Auto-scroll ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // ─── Send / Edit ─────────────────────────────────────────────────────────

  const handleSend = async () => {
    if (!message.trim() && !selectedMediaUri) return;

    const messageContent = message.trim();
    const capturedMediaUri = selectedMediaUri;
    const capturedReplyTo = replyingTo;
    const tempId = `temp-${Date.now()}`;

    setMessage('');
    setSelectedMediaUri(null);
    setReplyingTo(null);

    // Edit mode — update existing message
    if (editingMessage) {
      setEditingMessage(null);
      try {
        const { data } = await editMessageMutation({
          variables: { messageId: editingMessage.id, content: messageContent },
        });
        if (data?.editMessage?.success) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === editingMessage.id ? { ...m, content: messageContent, edited: true } : m
            )
          );
        } else {
          addAlert({ str: 'Failed to edit message', type: 'error' });
        }
      } catch {
        addAlert({ str: 'Failed to edit message', type: 'error' });
      }
      return;
    }

    // Optimistic message — appears BEFORE any async work, including uploads
    const optimisticMessage: Message = {
      id: tempId,
      content: messageContent || '📷 Image',
      type: capturedMediaUri ? 'image' : 'text',
      mediaUrl: capturedMediaUri || undefined,
      replyTo: capturedReplyTo?.id,
      sender: { id: user?.id || '', username: user?.username || 'You', profilePic: user?.profilePic || '' },
      readBy: [user?.id || ''],
      createdAt: new Date().toISOString(),
      sendStatus: 'pending',
    };

    setMessages((prev) => [...prev, optimisticMessage]);

    (async () => {
      try {
        let mediaUrl: string | null = null;
        let messageType = capturedMediaUri ? 'image' : 'text';
        let finalContent = messageContent || (capturedMediaUri ? '📷 Image' : '');

        if (capturedMediaUri) {
          mediaUrl = await uploadMediaToCloudinary(capturedMediaUri, fetchSignedUrl);
          if (!mediaUrl) throw new Error('Failed to upload media');
          // Swap local URI for the real Cloudinary URL
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, mediaUrl: mediaUrl! } : m))
          );
        }

        const res = await sendMessageMutation({
          variables: {
            chatId: id,
            content: finalContent,
            type: messageType,
            ...(capturedReplyTo && { replyTo: capturedReplyTo.id }),
            ...(mediaUrl && { attachments: [{ url: mediaUrl, type: 'image' }] }),
          },
        });

        if (res.data?.sendMessage?.success && res.data?.sendMessage?.messageData) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? { ...m, ...res.data.sendMessage.messageData, sendStatus: 'sent' }
                : m
            )
          );
        }

        WebSocketService.sendTypingStop(effectiveChatIdRef.current);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = null;
        }
      } catch (error: any) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...m, sendStatus: 'failed' } : m))
        );
        addAlert({ str: error.message || 'Failed to send message', type: 'error' });
      }
    })();
  };

  const handleTextChange = (text: string) => {
    setMessage(text);
    const cid = effectiveChatIdRef.current;
    if (text.trim()) {
      WebSocketService.sendTypingStart(cid);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => WebSocketService.sendTypingStop(cid), 2000);
    } else {
      WebSocketService.sendTypingStop(cid);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
    }
  };

  // ─── Load earlier messages ───────────────────────────────────────────────

  const handleLoadMore = async () => {
    if (!hasMore || loadingMore || !nextCursor) return;
    setLoadingMore(true);
    try {
      const result = await fetchMoreMessages({
        variables: { chatId: id, limit: 100, before: nextCursor },
      });
      const older: Message[] = result.data?.getChatMessages?.messages ?? [];
      if (older.length > 0) {
        setMessages((prev) => [...older, ...prev]);
        setNextCursor(result.data?.getChatMessages?.nextCursor ?? null);
        setHasMore(result.data?.getChatMessages?.hasMore ?? false);
      }
    } catch {
      addAlert({ str: 'Failed to load earlier messages', type: 'error' });
    } finally {
      setLoadingMore(false);
    }
  };

  // ─── Media / files ───────────────────────────────────────────────────────

  const handlePickMedia = async () => {
    try {
      const imageUri = await pickMediaFromGallery();
      if (imageUri) setSelectedMediaUri(imageUri);
    } catch (error: any) {
      addAlert({ str: error.message || 'Failed to open image picker', type: 'error' });
    }
  };

  // ─── Audio recording ─────────────────────────────────────────────────────

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        addAlert({ str: 'Microphone permission required', type: 'error' });
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(rec);
      setIsRecording(true);
      setRecordingDuration(0);
      recordingIntervalRef.current = setInterval(
        () => setRecordingDuration((p) => p + 1),
        1000
      );
      RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(waveAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
          RNAnimated.timing(waveAnim, { toValue: 0, duration: 400, useNativeDriver: true }),
        ])
      ).start();
    } catch (err) {
      console.error('Failed to start recording', err);
    }
  };

  const stopRecording = async (cancelled = false) => {
    setIsRecording(false);
    waveAnim.stopAnimation();
    waveAnim.setValue(0);
    if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
    try {
      await recording?.stopAndUnloadAsync();
      const uri = recording?.getURI();
      setRecording(null);
      if (uri && !cancelled && recordingDuration >= 1) {
        handleSendVoiceNote(uri);
      }
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  const handleSendVoiceNote = async (uri: string) => {
    setUploading(true);
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      content: '🎵 Voice Note',
      type: 'audio',
      sender: { id: user?.id || '', username: user?.username || 'You', profilePic: user?.profilePic || '' },
      readBy: [user?.id || ''],
      createdAt: new Date().toISOString(),
      sendStatus: 'pending',
    };
    setMessages((prev) => [...prev, optimisticMessage]);
    try {
      const audioUrl = await uploadMediaToCloudinary(uri, fetchSignedUrl);
      if (audioUrl) {
        const res = await sendMessageMutation({
          variables: { chatId: id, content: '🎵 Voice Note', type: 'audio', attachments: [{ url: audioUrl, type: 'audio' }] },
        });
        if (res.data?.sendMessage?.success && res.data?.sendMessage?.messageData) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId ? { ...m, ...res.data.sendMessage.messageData, sendStatus: 'sent' } : m
            )
          );
        }
      }
    } catch {
      addAlert({ str: 'Failed to send voice note', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handlePickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (!result.canceled && result.assets?.length > 0) {
        const asset = result.assets[0];
        setUploading(true);
        const tempId = `temp-${Date.now()}`;
        setMessages((prev) => [
          ...prev,
          {
            id: tempId,
            content: `📄 ${asset.name}`,
            type: 'file',
            sender: { id: user?.id || '', username: user?.username || 'You', profilePic: user?.profilePic || '' },
            readBy: [user?.id || ''],
            createdAt: new Date().toISOString(),
            sendStatus: 'pending',
          },
        ]);
        const fileUrl = await uploadMediaToCloudinary(asset.uri, fetchSignedUrl);
        if (fileUrl) {
          const res = await sendMessageMutation({
            variables: { chatId: id, content: `📄 ${asset.name}`, type: 'file', attachments: [{ url: fileUrl, type: 'file', name: asset.name }] },
          });
          if (res.data?.sendMessage?.success && res.data?.sendMessage?.messageData) {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === tempId ? { ...m, ...res.data.sendMessage.messageData, sendStatus: 'sent' } : m
              )
            );
          }
        }
        setUploading(false);
      }
    } catch {
      addAlert({ str: 'Failed to pick document', type: 'error' });
      setUploading(false);
    }
  };

  // ─── Chat actions ─────────────────────────────────────────────────────────

  const handleSummonSummary = async () => {
    try {
      const { data } = await summonSummaryMutation({ variables: { chatId: id } });
      if (!data?.summonSummary?.success) {
        addAlert({ str: 'Failed to summon summary', type: 'error' });
      }
    } catch {
      addAlert({ str: 'Failed to summon summary', type: 'error' });
    }
  };

  const handleVotePoll = async (messageId: string, optionIndex: number) => {
    try {
      await votePollMutation({ variables: { messageId, optionIndex } });
      // State updated via WS handlePollVoted — no refetch needed
    } catch (err) {
      console.error('Voting error:', err);
    }
  };

  const handleCreatePoll = async () => {
    const validOptions = pollOptions.filter((o) => o.trim() !== '');
    if (!pollQuestion.trim() || validOptions.length < 2) {
      addAlert({ str: 'Please enter a question and at least 2 options', type: 'error' });
      return;
    }
    setUploading(true);
    try {
      const { data } = await createPollMutation({ variables: { chatId: id, question: pollQuestion, options: validOptions } });
      if (data?.createPoll?.success) {
        setShowPollModal(false);
        setPollQuestion('');
        setPollOptions(['', '']);
        addAlert({ str: 'Poll created!', type: 'success' });
      }
    } catch {
      addAlert({ str: 'Failed to create poll', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  const handleReact = async (emoji: string) => {
    if (!reactionTarget) return;
    const { message: msg } = reactionTarget;
    try {
      const existing = msg.reactions?.find((r) => r.userId === user?.id && r.emoji === emoji);
      if (existing) {
        await removeReactionMutation({ variables: { messageId: msg.id, emoji } });
      } else {
        await addReactionMutation({ variables: { messageId: msg.id, emoji } });
      }
    } catch {
      addAlert({ str: 'Failed to react', type: 'error' });
    }
    setReactionTarget(null);
  };

  const handleDeleteMessage = async () => {
    if (!reactionTarget) return;
    const { message: msg } = reactionTarget;
    setReactionTarget(null);
    try {
      const { data } = await deleteMessageMutation({ variables: { messageId: msg.id } });
      if (data?.deleteMessage?.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msg.id ? { ...m, content: '[Message deleted]', deleted: true } : m
          )
        );
      }
    } catch {
      addAlert({ str: 'Failed to delete message', type: 'error' });
    }
  };

  const handleStartEdit = () => {
    if (!reactionTarget) return;
    const { message: msg } = reactionTarget;
    setReactionTarget(null);
    setEditingMessage(msg);
    setMessage(msg.content);
  };

  const handleLeaveChat = () => {
    setShowMenu(false);
    setShowLeaveConfirm(true);
  };

  const confirmLeaveChat = async () => {
    setShowLeaveConfirm(false);
    const shardId = chatData?.getChat?.chat?.shard?.id;
    if (!shardId) {
      addAlert({ str: 'Cannot leave this chat type', type: 'error' });
      return;
    }
    try {
      const { data } = await removeShardParticipant({ variables: { shardId, userId: user?.id } });
      if (data?.removeShardParticipant?.success) {
        addAlert({ str: 'Left chat successfully', type: 'success' });
        router.replace('/Home');
      } else {
        addAlert({ str: data?.removeShardParticipant?.message || 'Failed to leave chat', type: 'error' });
      }
    } catch {
      addAlert({ str: 'Failed to leave chat', type: 'error' });
    }
  };

  // ─── renderItem ───────────────────────────────────────────────────────────

  const renderItem = useCallback(
    ({ item }: { item: Message }) => {
      const isMe = item.sender.id === user?.id;
      const isSystem = item.type === 'system' || item.type === 'summary_ping';
      const isImage = item.type === 'image';
      const isAudio = item.type === 'audio';
      const isFile = item.type === 'file';
      const isPoll = item.type === 'poll';
      const isTask = item.type === 'minitask_assignment';

      // Resolve the quoted message for reply previews
      const quotedMessage = item.replyTo
        ? messagesRef.current.find((m) => m.id === item.replyTo) ?? null
        : null;

      // Minitask assignment card — rendered centered, not inside a bubble
      if (isTask && item.minitaskRef) {
        return (
          <MiniTaskAssignmentCard
            sender={item.sender}
            minitaskRef={item.minitaskRef}
            isAssignee={item.minitaskRef.assignedTo.id === user?.id}
            isDark={colorScheme === 'dark'}
            createdAt={item.createdAt}
          />
        );
      }

      // System / summary messages
      if (isSystem) {
        return (
          <View style={{ marginVertical: 10, alignItems: 'center', paddingHorizontal: 24 }}>
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              backgroundColor: colorScheme === 'dark' ? 'rgba(139,92,246,0.12)' : 'rgba(139,92,246,0.08)',
              borderWidth: 1, borderColor: colorScheme === 'dark' ? 'rgba(139,92,246,0.25)' : 'rgba(139,92,246,0.2)',
              borderRadius: RADIUS.lg, paddingHorizontal: 14, paddingVertical: 7,
            }}>
              <Ionicons name={item.type === 'summary_ping' ? 'stats-chart' : 'flag'} size={13} color={colorScheme === 'dark' ? '#c4b5fd' : '#7c3aed'} />
              <Text style={{ color: colorScheme === 'dark' ? '#c4b5fd' : '#7c3aed', fontSize: 12, fontFamily: FONT.medium, textAlign: 'center' }}>
                {item.content}
              </Text>
            </View>
            <Text style={{ color: colorScheme === 'dark' ? '#4b5563' : '#9ca3af', fontSize: 10, marginTop: 4 }}>
              {formatTime(item.createdAt)}
            </Text>
          </View>
        );
      }

      // Deleted message — show tombstone
      if (item.deleted) {
        return (
          <View className={`mb-3 flex-row ${isMe ? 'justify-end' : 'justify-start'}`}>
            {!isMe && <View className="mr-2 h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700" />}
            <View className={`max-w-[80%] rounded-2xl px-4 py-2 ${isMe ? 'rounded-tr-none bg-blue-400/50' : 'rounded-tl-none bg-gray-100 dark:bg-gray-800'}`}>
              <Text className="text-base italic text-gray-400 dark:text-gray-500">{item.content}</Text>
            </View>
          </View>
        );
      }

      // Reaction map for rendering reaction bubbles
      const reactionMap = (item.reactions || []).reduce(
        (acc: Record<string, { count: number; mine: boolean }>, r) => {
          if (!acc[r.emoji]) acc[r.emoji] = { count: 0, mine: false };
          acc[r.emoji].count++;
          if (r.userId === user?.id) acc[r.emoji].mine = true;
          return acc;
        },
        {}
      );

      const isNewMessage = !initialMessageIdsRef.current.has(item.id);
      return (
        <SwipeableMessage onSwipeReply={() => setReplyingTo(item)}>
          <Animated.View entering={isNewMessage ? FadeInDown.duration(250).springify() : undefined} className={`mb-3 flex-row ${isMe ? 'justify-end' : 'justify-start'}`}>
            {!isMe && (
              item.sender.profilePic ? (
                <Image
                  source={{ uri: item.sender.profilePic }}
                  className="mr-2 h-8 w-8 rounded-full bg-gray-200"
                />
              ) : (
                <View className="mr-2 h-8 w-8 items-center justify-center rounded-full bg-purple-200 dark:bg-purple-900">
                  <Text style={{ fontSize: 13, fontFamily: FONT.bold, color: '#7c3aed' }}>
                    {(item.sender.username?.[0] ?? '?').toUpperCase()}
                  </Text>
                </View>
              )
            )}
            <View style={{ maxWidth: '80%' }}>
              <TouchableOpacity
                onLongPress={() => setReactionTarget({ message: item, isMe })}
                activeOpacity={0.8}
                className={`rounded-2xl ${isImage ? 'p-1' : 'px-4 py-2'} ${
                  isMe
                    ? 'rounded-tr-none bg-blue-500'
                    : 'rounded-tl-none border border-gray-100 bg-white dark:border-gray-700 dark:bg-gray-800'
                }`}>
                {!isMe && (
                  <Text className={`mb-1 text-xs font-bold text-blue-500`}>
                    {item.sender.username}
                  </Text>
                )}

                {/* ─── Reply quote preview ─────────────────────────────── */}
                {quotedMessage && (
                  <View
                    style={{
                      borderLeftWidth: 3,
                      borderLeftColor: isMe ? 'rgba(255,255,255,0.5)' : brand.violet,
                      paddingLeft: 8,
                      paddingVertical: 4,
                      marginBottom: 6,
                      borderRadius: RADIUS.xs,
                      backgroundColor: isMe ? 'rgba(0,0,0,0.1)' : colorScheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                    }}>
                    <Text style={{ fontSize: 11, fontFamily: FONT.bold, color: isMe ? '#dbeafe' : brand.violet, marginBottom: 2 }}>
                      {quotedMessage.sender.id === user?.id ? 'You' : quotedMessage.sender.username}
                    </Text>
                    <Text style={{ fontSize: 12, color: isMe ? 'rgba(255,255,255,0.65)' : colorScheme === 'dark' ? '#9ca3af' : '#6b7280' }} numberOfLines={1}>
                      {quotedMessage.deleted
                        ? '🚫 Deleted message'
                        : quotedMessage.type === 'image' ? '📷 Photo'
                        : quotedMessage.type === 'audio' ? '🎵 Voice note'
                        : quotedMessage.type === 'file' ? '📄 File'
                        : quotedMessage.content}
                    </Text>
                  </View>
                )}

              {isAudio && (() => {
                const audioSrc = item.mediaUrl || (item as any).attachments?.[0]?.url;
                if (!audioSrc) return null;
                return <AudioMessagePlayer audioSrc={audioSrc} isMe={isMe} colorScheme={colorScheme} />;
              })()}

              {isFile && (
                <View className="flex-row items-center gap-3 py-2">
                  <Ionicons name="document-text" size={32} color={isMe ? '#fff' : '#3b82f6'} />
                  <Text numberOfLines={1} className={`flex-1 text-sm font-medium ${isMe ? 'text-white' : 'text-text-primary dark:text-text-dark'}`}>
                    {item.content}
                  </Text>
                </View>
              )}

              {isPoll && item.poll && (() => {
                const totalVotes = item.poll.options.reduce((s, o) => s + o.votes.length, 0);
                return (
                  <View style={{ paddingVertical: 8, minWidth: 220 }}>
                    <Text style={{ fontSize: 15, fontFamily: FONT.bold, color: isMe ? '#fff' : colorScheme === 'dark' ? '#fff' : '#111827', marginBottom: 10 }}>
                      {item.poll.question}
                    </Text>
                    {item.poll.options.map((opt, idx) => {
                      const iVoted = opt.votes.some((v) => v.id === user?.id);
                      const pct = totalVotes > 0 ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                      return (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => handleVotePoll(item.id, idx)}
                          style={{
                            marginBottom: 8,
                            borderRadius: RADIUS.sm,
                            overflow: 'hidden',
                            borderWidth: iVoted ? 1.5 : 1,
                            borderColor: iVoted ? (isMe ? 'rgba(255,255,255,0.6)' : brand.violet) : isMe ? 'rgba(255,255,255,0.25)' : colorScheme === 'dark' ? '#374151' : '#e5e7eb',
                          }}>
                          {/* Progress fill behind text */}
                          <View style={{
                            position: 'absolute', left: 0, top: 0, bottom: 0,
                            width: `${pct}%`,
                            backgroundColor: isMe ? 'rgba(255,255,255,0.18)' : colorScheme === 'dark' ? 'rgba(139,92,246,0.18)' : 'rgba(139,92,246,0.10)',
                          }} />
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                              {iVoted && <Ionicons name="checkmark-circle" size={14} color={isMe ? '#86efac' : brand.violet} />}
                              <Text style={{ fontSize: 14, color: isMe ? '#fff' : colorScheme === 'dark' ? '#f9fafb' : '#111827', flex: 1 }} numberOfLines={1}>
                                {opt.text}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 12, fontFamily: FONT.bold, color: isMe ? 'rgba(255,255,255,0.7)' : colorScheme === 'dark' ? '#9ca3af' : '#6b7280', marginLeft: 8 }}>
                              {pct}%
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                    <Text style={{ fontSize: 10, color: isMe ? 'rgba(255,255,255,0.45)' : colorScheme === 'dark' ? '#6b7280' : '#9ca3af', marginTop: 2 }}>
                      {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                    </Text>
                  </View>
                );
              })()}

              {isImage && item.mediaUrl ? (
                <View>
                  <Image source={{ uri: item.mediaUrl }} className="h-48 w-64 rounded-xl" resizeMode="cover" />
                  {item.content && item.content !== '📷 Image' && (
                    <Text className={`px-1 py-2 text-base ${isMe ? 'text-white' : 'text-text-primary dark:text-text-dark'}`}>
                      {item.content}
                    </Text>
                  )}
                </View>
              ) : (
                !isAudio && !isFile && !isPoll && !isTask && (
                  <Text className={`text-base ${isMe ? 'text-white' : 'text-text-primary dark:text-text-dark'}`}>
                    {item.content}
                  </Text>
                )
              )}

              {/* Timestamp + status + edited label */}
              <View className="mt-1 flex-row items-center gap-1 self-end">
                {item.edited && (
                  <Text style={{ fontSize: 9, color: isMe ? 'rgba(255,255,255,0.5)' : '#9ca3af' }}>
                    edited
                  </Text>
                )}
                <Text className={`text-[10px] ${isMe ? 'text-blue-100' : 'text-gray-400'}`}>
                  {formatTime(item.createdAt)}
                </Text>
                {isMe && (
                  item.id.startsWith('temp-') ? (
                    <Ionicons
                      name={item.sendStatus === 'failed' ? 'alert-circle-outline' : 'time-outline'}
                      size={12}
                      color={item.sendStatus === 'failed' ? '#ef4444' : '#DBEAFE'}
                    />
                  ) : (
                    <View className="flex-row">
                      <Ionicons name="checkmark" size={14} color="#DBEAFE" />
                      {item.readBy.length > 1 && (
                        <Ionicons name="checkmark" size={14} color="#DBEAFE" style={{ marginLeft: -8 }} />
                      )}
                    </View>
                  )
                )}
              </View>
            </TouchableOpacity>

            {/* Reaction bubbles */}
            {Object.keys(reactionMap).length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4, alignSelf: isMe ? 'flex-end' : 'flex-start' }}>
                {Object.entries(reactionMap).map(([emoji, { count, mine }]) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => {
                      setReactionTarget({ message: item, isMe });
                    }}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      backgroundColor: mine
                        ? colorScheme === 'dark' ? 'rgba(59,130,246,0.3)' : 'rgba(59,130,246,0.15)'
                        : colorScheme === 'dark' ? '#374151' : '#f3f4f6',
                      borderRadius: RADIUS.sm, paddingHorizontal: 6, paddingVertical: 2,
                      borderWidth: mine ? 1 : 0,
                      borderColor: '#3b82f6',
                    }}>
                    <Text style={{ fontSize: 12 }}>{emoji}</Text>
                    {count > 1 && (
                      <Text style={{ fontSize: 10, marginLeft: 2, color: colorScheme === 'dark' ? '#9ca3af' : '#6b7280' }}>
                        {count}
                      </Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </Animated.View>
      </SwipeableMessage>
    );
    },
    [user?.id, colorScheme, handleVotePoll]
  );

  // ─── Loading state ────────────────────────────────────────────────────────

  if (chatLoading || messagesLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background-paper dark:bg-background-dark-default">
        {/* Header skeleton */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colorScheme === 'dark' ? '#1f2937' : '#f3f4f6' }}>
          <View style={{ width: 24, height: 24, borderRadius: RADIUS.xs, backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#e5e7eb' }} />
          <View style={{ width: 120, height: 18, borderRadius: RADIUS.xs, backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#e5e7eb' }} />
          <View style={{ width: 24, height: 24, borderRadius: RADIUS.xs, backgroundColor: colorScheme === 'dark' ? '#2a2a2a' : '#e5e7eb' }} />
        </View>
        <ChatSkeleton isDark={colorScheme === 'dark'} />
      </SafeAreaView>
    );
  }

  const chatName =
    chatData?.getChat?.chat?.shard?.title || chatData?.getChat?.chat?.name || 'Shard Chat';

  // ─── JSX ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView className="flex-1 bg-background-paper dark:bg-background-dark-default">
      {/* Header */}
      <View className="z-10 flex-row items-center justify-between border-b border-gray-200 px-4 py-3 dark:border-gray-800">
        <TouchableOpacity onPress={() => router.back()} hitSlop={20} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
        </TouchableOpacity>
        <View className="items-center">
          <Text className="text-lg font-bold text-text-primary dark:text-text-dark">
            {chatName.length > 20 ? `${chatName.slice(0, 20)}...` : chatName}
          </Text>
          {chatData?.getChat?.chat?.participants && (
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {chatData.getChat.chat.participants.length} participants
            </Text>
          )}
        </View>
        <TouchableOpacity onPress={() => setShowMenu(true)} hitSlop={20} accessibilityLabel="More options">
          <Ionicons name="ellipsis-vertical" size={24} color={colorScheme === 'dark' ? '#fff' : '#000'} />
        </TouchableOpacity>
      </View>

      {/* Menu modal */}
      {showMenu && (
        <TouchableOpacity activeOpacity={1} onPress={() => setShowMenu(false)} className="absolute inset-0 z-50 bg-black/20">
          <View className="absolute right-4 top-14 w-48 rounded-xl bg-white p-2 shadow-xl dark:bg-gray-800" style={{ elevation: 5 }}>
            <TouchableOpacity onPress={() => { setShowMenu(false); router.push(`/(screens)/shard/${id}/chat-settings`); }} className="flex-row items-center rounded-lg p-3 active:bg-gray-100 dark:active:bg-gray-700">
              <Ionicons name="people-outline" size={20} color={colorScheme === 'dark' ? '#fff' : '#000'} />
              <Text className="ml-3 text-sm font-medium text-text-primary dark:text-text-dark">View Participants</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { setShowMenu(false); addAlert({ str: 'Notifications muted for this chat', type: 'success' }); }} className="flex-row items-center rounded-lg p-3 active:bg-gray-100 dark:active:bg-gray-700">
              <Ionicons name="notifications-off-outline" size={20} color={colorScheme === 'dark' ? '#fff' : '#000'} />
              <Text className="ml-3 text-sm font-medium text-text-primary dark:text-text-dark">Mute Notifications</Text>
            </TouchableOpacity>
            <View className="my-1 h-px bg-gray-200 dark:bg-gray-700" />
            <TouchableOpacity onPress={handleLeaveChat} className="flex-row items-center rounded-lg p-3 active:bg-red-50 dark:active:bg-red-900/20">
              <Ionicons name="log-out-outline" size={20} color="#ef4444" />
              <Text className="ml-3 text-sm font-medium text-red-500">Leave Chat</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      {/* Message list */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListHeaderComponent={
          hasMore ? (
            <TouchableOpacity onPress={handleLoadMore} disabled={loadingMore} className="mb-4 items-center py-2">
              {loadingMore ? (
                <ActivityIndicator size="small" color="#8b5cf6" />
              ) : (
                <Text className="text-xs font-medium text-purple-500">Load earlier messages</Text>
              )}
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-20">
            <Ionicons name="chatbubbles-outline" size={64} color="#9ca3af" />
            <Text className="mt-4 text-center text-gray-500 dark:text-gray-400">
              No messages yet. Start the conversation!
            </Text>
          </View>
        }
      />

      {/* Input area */}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        {typingUsers.length > 0 && <TypingIndicator users={typingUsers} />}

        <View className="border-t border-gray-200 bg-background-paper dark:border-gray-800 dark:bg-background-dark-default">
          {/* Reply banner */}
          {replyingTo && (
            <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-700">
              <View className="flex-row items-center gap-2 flex-1 mr-3">
                <View style={{ width: 3, height: '100%', backgroundColor: brand.violet, borderRadius: RADIUS.xs }} />
                <View className="flex-1">
                  <Text style={{ fontSize: 11, fontFamily: FONT.bold, color: brand.violet }}>
                    {replyingTo.sender.id === user?.id ? 'Replying to yourself' : `Replying to ${replyingTo.sender.username}`}
                  </Text>
                  <Text style={{ fontSize: 12, color: colorScheme === 'dark' ? '#9ca3af' : '#6b7280' }} numberOfLines={1}>
                    {replyingTo.deleted ? '🚫 Deleted message'
                      : replyingTo.type === 'image' ? '📷 Photo'
                      : replyingTo.type === 'audio' ? '🎵 Voice note'
                      : replyingTo.type === 'file' ? '📄 File'
                      : replyingTo.content}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={12} accessibilityLabel="Close">
                <Ionicons name="close" size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          )}

          {/* Edit mode banner */}
          {editingMessage && (
            <View className="flex-row items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-700">
              <View className="flex-row items-center gap-2">
                <Ionicons name="create-outline" size={16} color="#8b5cf6" />
                <Text className="text-xs text-purple-500" numberOfLines={1}>
                  Editing: {editingMessage.content.slice(0, 40)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => { setEditingMessage(null); setMessage(''); }} accessibilityLabel="Close">
                <Ionicons name="close" size={18} color="#9ca3af" />
              </TouchableOpacity>
            </View>
          )}

          {/* Attachment menu */}
          {isAttachmentMenuOpen && (
            <Animated.View entering={FadeInDown} className="flex-row flex-wrap gap-4 border-b border-gray-200 p-4 dark:border-gray-800">
              {[
                { icon: 'image', color: '#a855f7', bg: 'bg-purple-100 dark:bg-purple-900/30', label: 'Gallery', action: () => { handlePickMedia(); setIsAttachmentMenuOpen(false); } },
                { icon: 'document', color: '#3b82f6', bg: 'bg-blue-100 dark:bg-blue-900/30', label: 'Document', action: () => { handlePickDocument(); setIsAttachmentMenuOpen(false); } },
                { icon: 'stats-chart', color: '#22c55e', bg: 'bg-green-100 dark:bg-green-900/30', label: 'Poll', action: () => { setShowPollModal(true); setIsAttachmentMenuOpen(false); } },
                { icon: 'flash', color: '#f97316', bg: 'bg-orange-100 dark:bg-orange-900/30', label: 'Summary', action: () => { handleSummonSummary(); setIsAttachmentMenuOpen(false); } },
              ].map(({ icon, color, bg, label, action }) => (
                <View key={label} className="items-center">
                  <TouchableOpacity onPress={action} className={`h-12 w-12 items-center justify-center rounded-full ${bg}`}>
                    <Ionicons name={icon as any} size={24} color={color} />
                  </TouchableOpacity>
                  <Text className="mt-1 text-[10px] text-gray-500">{label}</Text>
                </View>
              ))}
              <TouchableOpacity onPress={() => setIsAttachmentMenuOpen(false)} className="absolute right-4 top-4" accessibilityLabel="Clear">
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </TouchableOpacity>
            </Animated.View>
          )}

          {/* Media preview */}
          {selectedMediaUri && (
            <View className="border-b border-gray-200 p-3 dark:border-gray-800">
              <View className="relative">
                <Image source={{ uri: selectedMediaUri }} className="h-24 w-32 rounded-lg" resizeMode="cover" />
                <TouchableOpacity onPress={() => setSelectedMediaUri(null)} className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1" accessibilityLabel="Close">
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Input row */}
          <View className="flex-row items-center p-4">
            <TouchableOpacity className="mr-3" onPress={() => setIsAttachmentMenuOpen(!isAttachmentMenuOpen)} disabled={uploading || !!editingMessage} accessibilityLabel="Add">
              <Ionicons name="add-circle-outline" size={28} color={uploading || editingMessage ? '#d1d5db' : colorScheme === 'dark' ? '#9ca3af' : '#6b7280'} />
            </TouchableOpacity>

            {isRecording ? (
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#f3f4f6', borderRadius: RADIUS.xl, paddingHorizontal: 14, paddingVertical: 10, gap: 8 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }} />
                <Text style={{ color: '#ef4444', fontFamily: FONT.semibold, fontSize: 13 }}>
                  {Math.floor(recordingDuration / 60)}:{String(recordingDuration % 60).padStart(2, '0')}
                </Text>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 3, height: 24 }}>
                  {[0.5, 0.9, 0.6, 1, 0.7, 0.4, 0.8, 0.6, 1, 0.5].map((h, i) => (
                    <RNAnimated.View key={i} style={{
                      flex: 1, borderRadius: RADIUS.xs, backgroundColor: '#ef4444', height: `${h * 100}%`,
                      opacity: waveAnim.interpolate({ inputRange: [0, 1], outputRange: [i % 2 === 0 ? 0.4 : 1, i % 2 === 0 ? 1 : 0.4] }),
                    }} />
                  ))}
                </View>
                <Text style={{ fontSize: 11, color: colorScheme === 'dark' ? '#9ca3af' : '#6b7280' }}>Release to send</Text>
              </View>
            ) : (
              <View className="flex-1 flex-row items-center rounded-full bg-gray-100 px-4 py-2 dark:bg-gray-800">
                <TextInput
                  value={message}
                  onChangeText={handleTextChange}
                  placeholder={editingMessage ? 'Edit message...' : selectedMediaUri ? 'Add a caption...' : 'Type a message...'}
                  placeholderTextColor={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'}
                  className="flex-1 text-base text-text-primary dark:text-text-dark"
                  multiline
                  editable={!sending && !uploading && !isRecording}
                />
                {message.length === 0 && !selectedMediaUri && !editingMessage && (
                  <TouchableOpacity onPressIn={startRecording} onPressOut={() => stopRecording(false)} className="ml-2" accessibilityLabel="Record audio">
                    <Ionicons name="mic-outline" size={24} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {isRecording ? (
              <TouchableOpacity onPress={() => stopRecording(true)} style={{ marginLeft: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center' }} accessibilityLabel="Delete">
                <Ionicons name="trash-outline" size={20} color="#fff" />
              </TouchableOpacity>
            ) : (message.trim() || selectedMediaUri) ? (
              <AnimatedPressable onPress={handleSend} disabled={sending || uploading} scaleDown={0.88} style={{ marginLeft: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: '#3b82f6', alignItems: 'center', justifyContent: 'center', opacity: sending || uploading ? 0.7 : 1 }}
            accessibilityLabel="Send">
                {sending || uploading ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="send" size={20} color="#fff" />}
              </AnimatedPressable>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Poll creation modal */}
      <Modal visible={showPollModal} animationType="slide" transparent>
        <View className="flex-1 justify-end bg-black/50">
          <View className="h-[70%] rounded-t-3xl bg-white p-6 dark:bg-gray-900">
            <View className="mb-6 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-text-primary dark:text-text-dark">Create Poll</Text>
              <TouchableOpacity onPress={() => setShowPollModal(false)} accessibilityLabel="Close">
                <Ionicons name="close" size={28} color={colorScheme === 'dark' ? '#fff' : '#000'} />
              </TouchableOpacity>
            </View>
            <Text className="mb-2 text-sm font-medium text-gray-500">Question</Text>
            <TextInput placeholder="What do you want to ask?" placeholderTextColor="#9ca3af" value={pollQuestion} onChangeText={setPollQuestion} className="mb-6 rounded-xl bg-gray-100 p-4 text-text-primary dark:bg-gray-800 dark:text-text-dark" />
            <Text className="mb-2 text-sm font-medium text-gray-500">Options</Text>
            {pollOptions.map((opt, idx) => (
              <View key={idx} className="mb-3 flex-row items-center">
                <TextInput placeholder={`Option ${idx + 1}`} placeholderTextColor="#9ca3af" value={opt} onChangeText={(text) => { const n = [...pollOptions]; n[idx] = text; setPollOptions(n); }} className="flex-1 rounded-xl bg-gray-100 p-4 text-text-primary dark:bg-gray-800 dark:text-text-dark" />
                {pollOptions.length > 2 && (
                  <TouchableOpacity onPress={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))} className="ml-2">
                    <Ionicons name="remove-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {pollOptions.length < 5 && (
              <TouchableOpacity onPress={() => setPollOptions([...pollOptions, ''])} className="mb-6 flex-row items-center gap-2">
                <Ionicons name="add-circle" size={24} color="#3b82f6" />
                <Text className="font-medium text-blue-500">Add Option</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleCreatePoll} disabled={uploading} className="items-center rounded-xl bg-blue-500 p-4">
              {uploading ? <ActivityIndicator color="#fff" /> : <Text className="text-lg font-bold text-white">Create Poll</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Reaction + actions sheet */}
      {reactionTarget && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setReactionTarget(null)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} activeOpacity={1} onPress={() => setReactionTarget(null)}>
            <View style={{ position: 'absolute', bottom: 160, left: 16, right: 16, alignItems: reactionTarget.isMe ? 'flex-end' : 'flex-start' }}>
              {/* Emoji row */}
              <View style={{ flexDirection: 'row', backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#ffffff', borderRadius: 32, paddingHorizontal: 12, paddingVertical: 8, gap: 4, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, elevation: 8, marginBottom: 8 }}>
                {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => {
                  const alreadyReacted = reactionTarget.message.reactions?.some(
                    (r) => r.userId === user?.id && r.emoji === emoji
                  );
                  return (
                    <TouchableOpacity
                      key={emoji}
                      onPress={() => handleReact(emoji)}
                      style={{
                        width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center',
                        backgroundColor: alreadyReacted ? 'rgba(59,130,246,0.2)' : colorScheme === 'dark' ? '#374151' : '#f3f4f6',
                        borderWidth: alreadyReacted ? 1 : 0, borderColor: '#3b82f6',
                      }}>
                      <Text style={{ fontSize: 24 }}>{emoji}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Action row */}
              <View style={{ backgroundColor: colorScheme === 'dark' ? '#1f2937' : '#ffffff', borderRadius: RADIUS.sm, overflow: 'hidden', minWidth: 180, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 }}>
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: colorScheme === 'dark' ? '#374151' : '#f3f4f6' }}
                  onPress={async () => { if (reactionTarget.message.content) { await Clipboard.setStringAsync(reactionTarget.message.content); addAlert({ str: 'Copied!', type: 'success' }); } setReactionTarget(null); }}>
                  <Ionicons name="copy-outline" size={18} color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'} />
                  <Text style={{ marginLeft: 10, color: colorScheme === 'dark' ? '#f9fafb' : '#111827', fontSize: 15 }}>Copy</Text>
                </TouchableOpacity>

                {reactionTarget.isMe && !reactionTarget.message.deleted && (
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: colorScheme === 'dark' ? '#374151' : '#f3f4f6' }}
                    onPress={handleStartEdit}>
                    <Ionicons name="create-outline" size={18} color={colorScheme === 'dark' ? '#9ca3af' : '#6b7280'} />
                    <Text style={{ marginLeft: 10, color: colorScheme === 'dark' ? '#f9fafb' : '#111827', fontSize: 15 }}>Edit</Text>
                  </TouchableOpacity>
                )}

                {reactionTarget.isMe && (
                  <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 14 }} onPress={handleDeleteMessage}>
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                    <Text style={{ marginLeft: 10, color: '#ef4444', fontSize: 15 }}>Delete</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Leave chat confirmation */}
      <ConfirmModal
        visible={showLeaveConfirm}
        onClose={() => setShowLeaveConfirm(false)}
        onConfirm={confirmLeaveChat}
        title="Leave Chat"
        message="You will be removed from this shard and its chat. This cannot be undone."
        confirmLabel="Leave"
        destructive
        icon="log-out-outline"
      />
    </SafeAreaView>
  );
};

export default ShardChat;
