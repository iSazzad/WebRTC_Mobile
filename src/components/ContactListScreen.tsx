import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ListRenderItem,
  Alert,
  ListRenderItemInfo,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Ionicons from "react-native-vector-icons/Ionicons";
import { getAllUsers, UserModel } from "../api/user";
import UserViewModel from "../viewmodels/UserViewModel";
import { useFocusEffect } from "@react-navigation/native";
import { Color } from "../utils/colors";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import { CallType } from "../screens/DashboardScreen";
import JoinScreen from "./JoinScreen";

type ContactListScreenProps = {
  onJoin: (user: UserModel, type: CallType) => void;
  onTapAccount: () => void;
};

const ContactListScreen = ({
  onJoin,
  onTapAccount,
}: ContactListScreenProps) => {
  const [users, setUsers] = React.useState<UserModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [newUser, setNewUser] = useState(false);
  const [otherUserId, setOtherUserId] = useState("");

  const userViewModel = new UserViewModel();

  useFocusEffect(
    useCallback(() => {
      getAllUsersAPI();
    }, [])
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

  const renderItem = (item: ListRenderItemInfo<UserModel>) => (
    <View style={styles.row}>
      <View style={styles.userInfo}>
        <Text style={styles.name}>{item.item.name}</Text>
        <Text style={styles.number}>{item.item.userId}</Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: "#11bb17ff" }]}
          onPress={() => {
            onJoin(item.item, "audio");
          }}
        >
          <Ionicons name="call-outline" size={20} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, { backgroundColor: "#11bb17ff" }]}
          onPress={() => {
            onJoin(item.item, "video");
          }}
        >
          <Ionicons name="videocam-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

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

      {/* List */}
      <FlatList
        data={users}
        keyExtractor={(item) => item.userId}
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
    borderBottomWidth: 1,
    borderColor: Color.White,
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

  name: {
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
});
