import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import TextInputContainer from "./TextInputContainer";
import UserViewModel from "../viewmodels/UserViewModel";
import { UserModel } from "../api/user";
import { Color } from "../utils/colors";
import { useFocusEffect } from "@react-navigation/native";
import Feather from "react-native-vector-icons/Feather";
import Clipboard from "@react-native-clipboard/clipboard";

interface EditProfileScreenProps {
  onJoin: (userDetails: UserModel) => void;
  onBack: () => void;
  user: UserModel;
}

const EditProfileScreen: React.FC<EditProfileScreenProps> = ({
  onJoin,
  user,
  onBack,
}) => {
  const [userName, setUserName] = useState(user?.name);
  const [otp, setOTP] = useState("");
  const [userEmail, setUserEmail] = useState(user?.email);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmailConfirm, setIsEmailConfirm] = useState(false);

  const userViewModel = new UserViewModel();

  const handleCopy = () => {
    Clipboard.setString(user.userId);
    Alert.alert("Copied!", "Your CallerId has been copied.");
  };

  const handleUpdateUser = async () => {
    if (userName.trim() && userEmail.trim()) {
      setIsLoading(true);
      setError(null);
      callUpdateUserAPI();
    } else {
      setError("Please fill in all fields");
      Alert.alert("Validation Error", "Please fill in all fields");
    }
  };

  /**
   * Update User & Guest User API
   * @param type
   */
  const callUpdateUserAPI = async (type: number = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await userViewModel.updateUser(
        type == 1 ? userName : undefined,
        type == 0 ? undefined : userEmail
      );

      if (type == 1) {
        Alert.alert("Success", JSON.stringify(response.message).toString());
        setIsEmailConfirm(true);
      } else {
        // manageResponse(response);
      }
    } catch (err: any) {
      const errorMsg =
        err?.data?.message || err?.message || "Failed to create user";
      setError(errorMsg);
      Alert.alert("Error", errorMsg);
      // console.error("Create user error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{
        flex: 1,
        backgroundColor: Color.ThemeMain,
        justifyContent: "center",
      }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            backgroundColor: Color.ThemeMain,
          }}
        >
          <TouchableOpacity
            onPress={onBack}
            style={{
              height: 44,
              width: 44,
              backgroundColor: Color.PopUpBg,
              justifyContent: "center",
              alignItems: "center",
              borderRadius: 30,
              marginTop: 16,
              position: "absolute",
              top: 50,
              left: 16,
            }}
          >
            <Feather name="x" size={24} color={"#FFF"} />
          </TouchableOpacity>

          <View
            style={{
              padding: 20,
              backgroundColor: Color.PopUpBg,
              justifyContent: "center",
              alignItems: "center",
              borderRadius: 14,
              marginHorizontal: 20,
            }}
          >
            <Text style={{ fontSize: 18, color: Color.TitleGrey }}>
              Your Caller ID
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 12,
                gap: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  color: Color.White,
                  letterSpacing: 6,
                }}
              >
                {user.userId}
              </Text>
              <TouchableOpacity style={{ padding: 5 }} onPress={handleCopy}>
                <Feather name="copy" color={Color.White} size={20} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Create New User Form */}
          <View
            style={{
              backgroundColor: "#8290fc",
              paddingHorizontal: 40,
              paddingVertical: 30,
              marginTop: 25,
              justifyContent: "center",
              borderRadius: 14,
              marginHorizontal: 42,
            }}
          >
            <Text style={{ fontSize: 18, color: "#D0D4DD", marginBottom: 16 }}>
              Edit Profile
            </Text>

            <TextInputContainer
              placeholder="Enter Name"
              value={userName}
              keyboardType="default"
              setValue={setUserName}
            />

            <TextInputContainer
              value={userEmail}
              placeholder="Enter Email"
              keyboardType="default"
              setValue={setUserEmail}
              editable={false}
            />

            <TouchableOpacity
              disabled={isLoading}
              onPress={handleUpdateUser}
              style={{
                height: 50,
                backgroundColor: isLoading ? "#e0e0e1ff" : Color.ThemeMain,
                justifyContent: "center",
                alignItems: "center",
                borderRadius: 12,
                marginTop: 16,
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text
                  style={{ fontSize: 16, color: "#FFF", fontWeight: "600" }}
                >
                  {"Update"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default EditProfileScreen;
