import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ViewToken,
  ViewabilityConfigCallbackPair,
  Alert,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import Fontisto from "react-native-vector-icons/Fontisto";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Socket } from "socket.io-client";

import { UserModel } from "../api/user";
import { Color } from "../utils/colors";
import { CallType } from "../screens/DashboardScreen";
import Avatar from "./ui/Avatar";
import { getDateHeader, isSameDay } from "../utils/helper";
import { ChatListItem, ChatUser } from "../models/ChatListItem";

interface Message {
  _id: string;
  chatUniqueId: string;
  senderId: string;
  message: string;
  messageType: "text" | "image" | "video" | "file";
  status: {
    sentAt: Date | null;
    deliveredAt: Date | null;
    readAt: Date | null;
  };
  deletedFor: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface ChatScreenProps {
  details: ChatListItem;
  onBack: () => void;
  onCall: (type: CallType) => void;
  socket: Socket;
  callerId: string;
}

export default function ChatScreen({
  details,
  onBack,
  onCall,
  socket,
  callerId,
}: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const [chatUniqueId, setChatUniqueId] = useState<string | null>(null);
  const [stickyDate, setStickyDate] = useState<string | null>(null);

  const page = useRef<number>(1);

  /* ---------------- MOCK LAST READ ---------------- */
  const lastReadAt = useRef<Date | null>(null);
  const flatListRef = useRef<FlatList>(null);

  /* ---------------- JOIN CHAT ---------------- */
  useEffect(() => {
    if (!details?.user?.userId) return;
    socket.emit("joinChat", { chatUniqueId: details?.chatUniqueId });
  }, [details?.user?.userId]);

  /* ---------------- SOCKET LISTENERS ---------------- */
  useEffect(() => {
    socket.on("chatReady", (data) => {
      page.current = 1;
      setMessages([]);
      setHasMore(true);
      setChatUniqueId(details?.chatUniqueId);
    });

    socket.on("chatError", (data) => {
      Alert.alert(data.message || "Failed to load chat");
      handleBack();
    });

    socket.on("messagesList", (data) => {
      setLoadingMore(false);
      if (data.messages.length === 0) {
        setHasMore(false);
        return;
      }
      page.current = data.page;
      setMessages((prev) => processMessages([...data.messages, ...prev]));
    });

    socket.on("receiveMessage", (data) => {
      setMessages((prev) => processMessages([...prev, data.message]));
      socket.emit("messageRead", {
        chatUniqueId: data.message.chatUniqueId,
        userId: data.message.senderId,
      });
    });

    socket.on("readReceipt", () => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.senderId === callerId
            ? { ...msg, status: { ...msg.status, readAt: new Date() } }
            : msg,
        ),
      );
    });

    socket.on("deliveryReceipt", ({ messageId, userId }) => {
      setMessages((prev) =>
        prev.map((msg) => {
          const isSameMessage = msg._id?.toString() === messageId.toString();
          const notDeliveredYet = !msg.status?.deliveredAt;
          if (isSameMessage && notDeliveredYet) {
            return {
              ...msg,
              status: {
                ...msg.status,
                deliveredAt: new Date(),
              },
            };
          }
          return msg;
        }),
      );
    });

    return () => {
      socket.off("chatReady");
      socket.off("chatError");
      socket.off("messagesList");
      socket.off("receiveMessage");
      socket.off("readReceipt");
      socket.off("deliveryReceipt");
    };
  }, []);

  useEffect(() => {
    if (!chatUniqueId) return;
    fetchMessages(1);
  }, [chatUniqueId]);

  const handleBack = () => {
    socket.emit("leaveChat", { chatUniqueId });
    onBack();
  };

  /* ---------------- SEND MESSAGE ---------------- */
  const sendMessage = () => {
    if (!text.trim() || !chatUniqueId) return;

    const localMsg = createLocalMessage(text);
    setMessages((prev) => processMessages([...prev, localMsg]));

    socket.emit(
      "sendMessage",
      { chatUniqueId, senderId: callerId, message: text },
      (res: { success: boolean; message?: Message }) => {
        if (!res?.success || !res.message) return;
        setMessages((prev) =>
          prev.map((m) => (m._id === localMsg._id ? res.message! : m)),
        );
      },
    );

    setText("");
  };

  /* ---------------- CREATE LOCAL MESSAGE ---------------- */
  const createLocalMessage = (text: string): Message => ({
    _id: `local-${Date.now()}`,
    chatUniqueId: chatUniqueId!,
    senderId: callerId,
    message: text,
    messageType: "text",
    status: { sentAt: null, deliveredAt: null, readAt: null },
    deletedFor: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  /* ---------------- HELPERS ---------------- */
  const getMessageStatus = (msg: Message) => {
    if (msg.status.readAt) return "read";
    if (msg.status.deliveredAt) return "delivered";
    if (msg.status.sentAt) return "sent";
    return "unsend";
  };

  /* ---------------- MESSAGE GROUPING & DIVIDERS ---------------- */
  const isSameSender = (a?: Message, b?: Message) =>
    a && b && a.senderId === b.senderId;

  const shouldShowUnreadDivider = (index: number) => {
    if (!lastReadAt?.current) return false;
    const curr = messages[index];
    const prev = messages[index + 1];
    return (
      new Date(curr.createdAt) > lastReadAt?.current &&
      (!prev || new Date(prev.createdAt) <= lastReadAt?.current)
    );
  };

  /* ---------------- FETCH MESSAGES ---------------- */
  const fetchMessages = (pageNumber: number) => {
    if (!chatUniqueId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    socket.emit("getMessages", { chatUniqueId, page: pageNumber, limit: 20 });
  };

  /* ---------------- PROCESS MESSAGES ---------------- */
  const processMessages = (msgs: Message[]) => {
    const map = new Map<string, Message>();
    msgs.forEach((m) => map.set(m._id, m));
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  };

  /* ---------------- VIEWABILITY ---------------- */
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (!viewableItems || viewableItems.length === 0) return;

      // For inverted list, pick last visible item as "top"
      const visibleMsgs = viewableItems
        .filter((v) => v.isViewable && v.item?.createdAt)
        .map((v) => v.item);

      if (visibleMsgs.length) {
        const topMessage = visibleMsgs[visibleMsgs.length - 1];
        setStickyDate(getDateHeader(new Date(topMessage.createdAt)));
      }
    },
  ).current;

  const viewabilityConfigCallbackPairs = useRef<
    ViewabilityConfigCallbackPair[]
  >([
    {
      viewabilityConfig,
      onViewableItemsChanged,
    },
  ]);

  /* ---------------- ON SCROLL ---------------- */
  const onScroll = (event: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;

    const distanceFromBottom =
      contentSize.height - (contentOffset.y + layoutMeasurement.height);

    // If scrolled near bottom (<50 px), mark latest message as read
    if (distanceFromBottom < 50 && messages.length) {
      const latestMsg = messages[0]; // inverted list, index 0 is latest
      if (
        !lastReadAt.current ||
        new Date(latestMsg.createdAt) > lastReadAt.current
      ) {
        lastReadAt.current = new Date(latestMsg.createdAt);
        // optionally emit read receipt
        socket.emit("messageRead", { chatUniqueId, userId: callerId });
      }
    }

    // If scrolled upward > 200 px, mark message at that point as read
    if (distanceFromBottom > 200) {
      const visibleMsgs = messages.slice(0, 5); // approximate, top visible
      if (visibleMsgs.length) {
        const msgAtScroll = visibleMsgs[0];
        if (
          !lastReadAt.current ||
          new Date(msgAtScroll.createdAt) > lastReadAt.current
        ) {
          lastReadAt.current = new Date(msgAtScroll.createdAt);
          socket.emit("messageRead", { chatUniqueId, userId: callerId });
        }
      }
    }
  };

  /* ---------------- RENDER MESSAGE ---------------- */
  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.senderId === callerId;
    const status = getMessageStatus(item);
    const currentDate = new Date(item.createdAt);

    const prev = messages[index + 1];
    const next = messages[index - 1];

    const showDateHeader =
      !prev || !isSameDay(currentDate, new Date(prev.createdAt));

    const isFirstInGroup = !isSameSender(item, prev);
    const isLastInGroup = !isSameSender(item, next);

    return (
      <>
        {showDateHeader && (
          <View style={styles.dateHeader}>
            <Text style={styles.dateHeaderText}>
              {getDateHeader(currentDate)}
            </Text>
          </View>
        )}

        {shouldShowUnreadDivider(index) && (
          <View style={styles.unreadDivider}>
            <Text style={styles.unreadText}>Unread messages</Text>
          </View>
        )}

        <View style={[styles.messageRow, isMe ? styles.right : styles.left]}>
          <View
            style={[
              styles.bubble,
              isMe ? styles.myBubble : styles.otherBubble,
              !isFirstInGroup && styles.groupedTop,
              !isLastInGroup && styles.groupedBottom,
            ]}
          >
            <Text style={isMe ? styles.messageMyText : styles.messageText}>
              {item.message}
            </Text>

            <View style={styles.metaRow}>
              <Text style={isMe ? styles.myTime : styles.time}>
                {currentDate.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>

              {isMe &&
                (status === "unsend" ? (
                  <Fontisto name="clock" size={11} color="#999" />
                ) : (
                  <MaterialIcons
                    name={status === "sent" ? "check" : "done-all"}
                    size={14}
                    color={status === "read" ? "#4fc3f7" : "#999"}
                  />
                ))}
            </View>
          </View>
        </View>
      </>
    );
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {stickyDate && (
            <View style={styles.stickyDate}>
              <Text style={styles.stickyDateText}>{stickyDate}</Text>
            </View>
          )}

          {/* HEADER */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBack}>
              <MaterialIcons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>

            <Avatar
              name={details.user?.name ?? ""}
              imageUrl={details.user?.imageUrl ?? ""}
              size={40}
              style={{ marginHorizontal: 10 }}
            />

            <View style={{ flex: 1 }}>
              <Text style={styles.username}>{details.user?.name}</Text>
              <Text style={styles.status}>Online</Text>
            </View>

            <Ionicons
              name="call-outline"
              size={22}
              color="#fff"
              onPress={() => onCall("audio")}
            />
            <Ionicons
              name="videocam-outline"
              size={22}
              color="#fff"
              style={{ marginLeft: 12 }}
              onPress={() => onCall("video")}
            />
          </View>

          {/* CHAT */}
          <FlatList
            ref={flatListRef}
            data={messages}
            inverted
            renderItem={renderMessage}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ padding: 12 }}
            onEndReached={() => fetchMessages(page.current + 1)}
            onEndReachedThreshold={0.2}
            viewabilityConfigCallbackPairs={
              viewabilityConfigCallbackPairs.current
            }
            onScroll={onScroll}
            scrollEventThrottle={100}
          />

          {/* INPUT */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={text}
              onChangeText={setText}
              placeholder="Type a message"
              multiline
            />
            <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
              <MaterialIcons name="send" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

/* ---------------- STYLES ---------------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: Color.ThemeMain,
    height: 60,
  },

  username: { color: "#fff", fontSize: 16, fontWeight: "600" },
  status: { color: "#d0e6ff", fontSize: 12 },

  stickyDate: {
    position: "absolute",
    top: 66,
    alignSelf: "center",
    backgroundColor: "#e0e0e0",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 20,
  },
  stickyDateText: { fontSize: 12, fontWeight: "600", color: "#555555" },

  messageRow: { flexDirection: "row", marginBottom: 2 },
  left: { justifyContent: "flex-start" },
  right: { justifyContent: "flex-end" },

  bubble: { maxWidth: "75%", padding: 10, borderRadius: 12 },
  myBubble: { backgroundColor: Color.ThemeMain },
  otherBubble: { backgroundColor: "#eee" },

  groupedTop: { borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  groupedBottom: { borderBottomLeftRadius: 4, borderBottomRightRadius: 4 },

  messageMyText: { color: "#fff", fontSize: 15 },
  messageText: { color: "#000", fontSize: 15 },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    justifyContent: "flex-end",
  },
  myTime: { color: "#fff", fontSize: 10, marginRight: 2, textAlign: "right" },
  time: { color: "#555", fontSize: 10, marginRight: 2, textAlign: "right" },

  inputContainer: {
    flexDirection: "row",
    padding: 8,
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  input: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  sendBtn: {
    marginLeft: 8,
    backgroundColor: Color.ThemeMain,
    borderRadius: 20,
    padding: 10,
  },

  dateHeader: {
    alignSelf: "center",
    backgroundColor: "#b7f7b4",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginVertical: 8,
  },
  dateHeaderText: { fontSize: 12, color: "#000", fontWeight: "500" },

  unreadDivider: {
    alignSelf: "center",
    backgroundColor: "#d0e6ff",
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    marginVertical: 8,
  },
  unreadText: { fontSize: 12, color: "#0b5ed7", fontWeight: "600" },
});
