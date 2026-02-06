import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import Feather from "react-native-vector-icons/Feather";
import Octicons from "react-native-vector-icons/Octicons";

import Avatar from "./Avatar";
import { Color } from "../../utils/colors";
import { UserModel } from "../../api/user";
import { ChatListItem } from "../../models/ChatListItem";
import { InvitedUser } from "../../models/InvitedUserItem";

type ItemType = "chat" | "invite" | "user";

interface Props {
  type: ItemType;
  callerId: string;
  item: UserModel | InvitedUser | ChatListItem;
  onTapAdd?: (user: UserModel) => void;
  onTapInvite?: (invite: InvitedUser, accept: boolean) => void;
  onTapUser?: (chatItem: ChatListItem) => void;
}

const UserItem: React.FC<Props> = ({
  type,
  item,
  callerId,
  onTapUser,
  onTapInvite,
  onTapAdd,
}) => {
  /* ---------------- CHAT ITEM ---------------- */
  if (type === "chat") {
    const chatItem = item as ChatListItem;
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        style={styles.row}
        onPress={() => onTapUser?.(chatItem)}
      >
        <View style={styles.userContainer}>
          <Avatar
            name={chatItem.user?.name || "Unknown"}
            imageUrl=""
            size={44}
            style={{ marginRight: 12 }}
          />

          <View style={styles.userInfo}>
            <Text style={styles.name}>{chatItem.user?.name}</Text>
            <Text style={styles.number}>
              {chatItem.lastMessage?.text || ""}
            </Text>
          </View>

          <View style={styles.countContainer}>
            <Text style={styles.count}>{chatItem.unreadCount || 0}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  /* ---------------- INVITATION ITEM ---------------- */
  if (type === "invite") {
    const inviteItem = item as InvitedUser;
    return (
      <TouchableOpacity activeOpacity={0.85} style={styles.row}>
        <View style={styles.userContainer}>
          <Avatar
            name={inviteItem.fromUser.name}
            imageUrl=""
            size={44}
            style={{ marginRight: 12 }}
          />

          <View style={styles.userInfo}>
            <Text style={styles.name}>{inviteItem.fromUser.name}</Text>
            <Text style={styles.number}>{inviteItem.fromUser.userId}</Text>
          </View>

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.btn, { backgroundColor: "rgb(243, 73, 73)" }]}
              onPress={() => onTapInvite?.(inviteItem, false)}
            >
              <Octicons name="x" size={24} color={Color.White} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btn, { backgroundColor: "rgb(95, 231, 100)" }]}
              onPress={() => onTapInvite?.(inviteItem, true)}
            >
              <Octicons name="check" size={24} color={Color.White} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  }

  const itemUser = item as UserModel;
  if (itemUser.hasAcceptedInvitation || itemUser.userId === callerId) {
    return <></>;
  }
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={styles.row}
      disabled={itemUser.hasInvitation}
      onPress={() => onTapAdd?.(itemUser)}
    >
      <View style={styles.userContainer}>
        <Avatar
          name={itemUser.name}
          imageUrl=""
          size={44}
          style={{ marginRight: 12 }}
        />

        <View style={styles.userInfo}>
          <Text style={styles.name}>{itemUser.name}</Text>
          <Text style={styles.number}>{itemUser.userId}</Text>
        </View>
      </View>

      <Feather
        name="user-plus"
        size={24}
        color={itemUser.hasInvitation ? Color.BGGrey : Color.White}
      />
    </TouchableOpacity>
  );
};

export default UserItem;

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
    borderBottomWidth: 1,
    borderColor: "#f0f0f0",
  },

  userInfo: {
    flex: 1,
  },
  userContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },

  name: {
    fontSize: 16,
    fontWeight: "500",
    color: Color.White,
  },
  count: {
    fontSize: 16,
    fontWeight: "500",
    color: Color.White,
  },
  number: {
    fontSize: 14,
    color: Color.White,
    marginTop: 2,
  },

  buttons: {
    flexDirection: "row",
    gap: 10,
  },

  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  countContainer: {
    marginLeft: 10,
    backgroundColor: "red",
    borderRadius: 50,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
