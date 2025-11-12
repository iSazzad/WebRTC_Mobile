import React, { useState } from "react";
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

interface NewUserScreenProps {
  onJoin: (userDetails: UserModel) => void;
}

const NewUserScreen: React.FC<NewUserScreenProps> = ({ onJoin }) => {
  const [isNewUser, setIsNewUser] = useState(true);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userViewModel = new UserViewModel();

  const handleCreateUser = async () => {
    if (userName.trim() && userEmail.trim()) {
      setIsLoading(true);
      setError(null);
      callCreateUserAPI();
    } else {
      setError("Please fill in all fields");
      Alert.alert("Validation Error", "Please fill in all fields");
    }
  };
  const handleSkip = () => {
    setUserName("");
    setUserEmail("");
    callCreateUserAPI(0);
  };

  const handleJoinExisting = () => {
    if (userEmail.trim()) {
      callCreateUserAPI(2);
    }
  };

  const callCreateUserAPI = async (type: number = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await userViewModel.createUser(
        type == 1 ? userName : undefined,
        type == 0 ? undefined : userEmail
      );

      // Store tokens
      if (response.tokens?.access) {
        await AsyncStorage.setItem("accessToken", response.tokens.access);
      }
      if (response.tokens?.refresh) {
        await AsyncStorage.setItem("refreshToken", response.tokens.refresh);
      }

      // Store user info as single object
      if (response.user) {
        await AsyncStorage.setItem(
          "userDetails",
          JSON.stringify(response.user)
        );
      }

      // Alert.alert("Success", JSON.stringify(response));
      setUserName("");
      setUserEmail("");
      onJoin(response.user);
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
        paddingHorizontal: 42,
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
          {/* Create New User Form */}
          <View
            style={{
              backgroundColor: "#8290fc",
              paddingHorizontal: 40,
              paddingVertical: 30,
              marginTop: 25,
              justifyContent: "center",
              borderRadius: 14,
            }}
          >
            <Text style={{ fontSize: 18, color: "#D0D4DD", marginBottom: 16 }}>
              {isNewUser ? "Create New User" : "Connect with Existing User"}
            </Text>

            {isNewUser && (
              <TextInputContainer
                placeholder="Enter Name"
                keyboardType="default"
                setValue={setUserName}
              />
            )}
            <TextInputContainer
              placeholder="Enter Email"
              keyboardType="default"
              setValue={setUserEmail}
            />

            <TouchableOpacity
              disabled={isLoading}
              onPress={isNewUser ? handleCreateUser : handleJoinExisting}
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
                  {isNewUser ? "Create User" : "Join Now"}
                </Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setIsNewUser(!isNewUser)}
              style={{
                backgroundColor: "transparent",
                justifyContent: "center",
                alignItems: "center",
                borderRadius: 12,
                marginTop: 15,
                paddingVertical: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 16,
                  color: "#1A1C22",
                  fontWeight: "600",
                }}
              >
                {isNewUser ? "Already Exist User" : "New User"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleSkip}
              style={{
                backgroundColor: "transparent",
                justifyContent: "center",
                alignItems: "center",
                borderRadius: 12,
                marginTop: 15,
                paddingVertical: 10,
              }}
            >
              <Text style={{ fontSize: 16, color: "#fff", fontWeight: "600" }}>
                Add Later! Skip...
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default NewUserScreen;
