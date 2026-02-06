export interface ChatUser {
  userId: string;
  name: string;
  avatar: string | null;
  email: string | null;
  imageUrl?: string | null;
}

export interface LastMessage {
  id: string;
  text: string;
  type: "text" | "image" | "video" | "file";
  time: string; // ISO string
  senderId: string;
}

export interface ChatListItem {
  chatUniqueId: string;
  chatType: "private" | "group";

  user?: ChatUser;
  group?: {
    groupName: string;
    groupAdmin: string;
  };

  lastMessage: LastMessage | null;
  unreadCount: number | null;
}
