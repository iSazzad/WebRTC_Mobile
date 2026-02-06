import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ListRenderItemInfo,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import Octicons from "react-native-vector-icons/Octicons";
import { getAllUsers, UserModel } from "../api/user";
import UserViewModel from "../viewmodels/UserViewModel";
import { useFocusEffect } from "@react-navigation/native";
import { Color } from "../utils/colors";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { CallType } from "../screens/DashboardScreen";
import JoinScreen from "./JoinScreen";
import Avatar from "./ui/Avatar";
import SegmentedControl from "./ui/SegmentedControl";
import { ChatListItem, ChatUser } from "../models/ChatListItem";
import Feather from "react-native-vector-icons/Feather";
import { InvitedUser } from "../models/InvitedUserItem";
import UserItem from "./ui/UserItem";

type ContactListScreenProps = {
  onJoin: (user: UserModel, type: CallType) => void;
  onTapUser: (chatItem: ChatListItem) => void;
  onTapAdd: (user: UserModel) => void;
  onTapAccount: () => void;
  onTapInvite: (inviteUser: InvitedUser, isAccepted: boolean) => void;
  callerId?: string;
  chatList: ChatListItem[];
  invitedUsers: InvitedUser[];
  reloadUserList: boolean;
};

const ContactListScreen = ({
  onJoin,
  onTapAccount,
  onTapInvite,
  onTapUser,
  onTapAdd,
  callerId,
  chatList,
  invitedUsers,
  reloadUserList,
}: ContactListScreenProps) => {
  const [users, setUsers] = React.useState<UserModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newUser, setNewUser] = useState(false);
  const [otherUserId, setOtherUserId] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  const segments = ["Friends", "Request", "All Users"];
  const userViewModel = new UserViewModel();

  useFocusEffect(
    useCallback(() => {
      getAllUsersAPI();
    }, [reloadUserList]),
  );
  /**
   * Get All Users API
   * @param type
   */
  const getAllUsersAPI = async () => {
    setIsLoading(true);
    try {
      const response = await userViewModel.getAllUsers();
      setUsers(response.data);
    } catch (err: any) {
      const errorMsg =
        err?.data?.message || err?.message || "Failed to create user";
      Alert.alert("Error", errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = (
    item: ListRenderItemInfo<UserModel | InvitedUser | ChatListItem>,
  ) => {
    const type =
      selectedIndex === 0 ? "chat" : selectedIndex === 1 ? "invite" : "user";
    return (
      <UserItem
        callerId={callerId}
        type={type}
        item={item.item}
        onTapUser={onTapUser}
        onTapInvite={onTapInvite}
        onTapAdd={onTapAdd}
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{`Users List`}</Text>

        <View style={{ flexDirection: "row", gap: 5 }}>
          <TouchableOpacity
            onPress={() => {
              setNewUser(true);
            }}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={26} color={Color.White} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onTapAccount} style={styles.addBtn}>
            <FontAwesome name="user-circle-o" size={24} color={Color.White} />
          </TouchableOpacity>
        </View>
      </View>

      <SegmentedControl
        segments={segments}
        selectedIndex={selectedIndex}
        onChange={setSelectedIndex}
        style={{ marginHorizontal: 10, marginTop: 5 }}
      />

      {/* List */}
      <FlatList
        data={
          selectedIndex == 0
            ? chatList
            : selectedIndex == 1
            ? invitedUsers
            : users
        }
        keyExtractor={(item, index) => String(index)}
        renderItem={renderItem}
        contentContainerStyle={{ paddingTop: 10 }}
      />
      {newUser && (
        <Modal animationType="slide" transparent={true} visible={newUser}>
          <JoinScreen
            onClose={() => setNewUser(false)}
            callerId={""}
            otherUserId={otherUserId}
            onJoin={(type: CallType, id: string) => {
              const item: UserModel = {
                userId: id,
                name: "",
                email: "",
                expiresIn: undefined,
              };
              onJoin(item, type);
            }}
            setOtherUserId={setOtherUserId}
          />
        </Modal>
      )}
    </SafeAreaView>
  );
};

export default ContactListScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Color.ThemeMain },

  header: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    justifyContent: "space-between",
    // borderBottomWidth: 1,
    // borderColor: Color.White,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Color.White,
  },

  addBtn: {
    padding: 6,
  },

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
