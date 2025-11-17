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
import TextInputContainer from "../components/TextInputContainer";
import UserViewModel from "../viewmodels/UserViewModel";
import { CommonResponse, CreateUserResponse, UserModel } from "../api/user";
import { Color } from "../utils/colors";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Routes } from "../navigation/Routes";
import { isValidOtp } from "../utils/validations";

const NewUserScreen: React.FC = () => {
  const [isNewUser, setIsNewUser] = useState(true);
  const [userName, setUserName] = useState("");
  const [otp, setOTP] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEmailConfirm, setIsEmailConfirm] = useState(false);

  const userViewModel = new UserViewModel();
  const navigation = useNavigation();

  useFocusEffect(
    useCallback(() => {
      checkUser();
    }, [])
  );

  /**
   * Check User Details and Navigate to Dashboard
   */
  const checkUser = async () => {
    const user = await AsyncStorage.getItem("userDetails");
    if (user) {
      const userData: UserModel = JSON.parse(user);
      console.log("user data: ", userData);

      if (userData.userId) {
        navigation.navigate(Routes.Dashboard, {});
      }
    }
  };

  /**
   *
   */
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

  /**
   *
   */
  const handleSkip = () => {
    setUserName("");
    setUserEmail("");
    callCreateUserAPI(0);
  };

  /**
   *
   */
  const handleJoinExisting = () => {
    if (userEmail.trim()) {
      callCheckUserAPI();
    }
  };

  /**
   * Create User & Guest User API
   * @param type
   */
  const callCreateUserAPI = async (type: number = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await userViewModel.createUser(
        type == 1 ? userName : undefined,
        type == 0 ? undefined : userEmail
      );

      if (type == 1) {
        Alert.alert("Success", JSON.stringify(response.message).toString());
        setIsEmailConfirm(true);
      } else {
        manageResponse(response);
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

  /**
   * Check User API
   * @param type
   */
  const callCheckUserAPI = async (type: number = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await userViewModel.sendOtpToEmail(userEmail);

      Alert.alert("Success", JSON.stringify(response.message).toString());
      setIsEmailConfirm(true);
    } catch (err: any) {
      const errorMsg =
        err?.data?.message || err?.message || "Failed to create user";
      setError(errorMsg);
      Alert.alert("Error", errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Verify UserEmail OTP API
   * @returns
   */
  const verifyUserEmailOTPAPI = async () => {
    if (!isValidOtp(otp)) {
      Alert.alert("Invalid OTP", "Please enter a 6-digit numeric OTP");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await userViewModel.verifyOtp(userEmail, otp);
      manageResponse(response);
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

  /**
   * Manage Create User or Verify User Email Response
   * @param response
   */
  const manageResponse = async (
    response: CommonResponse<CreateUserResponse>
  ) => {
    // Store tokens
    if (response.data.tokens?.access) {
      await AsyncStorage.setItem("accessToken", response.data.tokens.access);
    }
    if (response.data.tokens?.refresh) {
      await AsyncStorage.setItem("refreshToken", response.data.tokens.refresh);
    }

    // Store user info as single object
    if (response.data.user) {
      await AsyncStorage.setItem(
        "userDetails",
        JSON.stringify(response.data.user)
      );
    }

    setUserName("");
    setUserEmail("");
    navigation.navigate(Routes.Dashboard, {});
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
                value={userName}
                setValue={setUserName}
                editable={!isEmailConfirm}
              />
            )}
            <TextInputContainer
              placeholder="Enter Email"
              keyboardType="default"
              value={userEmail}
              setValue={setUserEmail}
              editable={!isEmailConfirm}
            />

            {isEmailConfirm && (
              <TextInputContainer
                value={otp}
                placeholder="Enter OTP"
                keyboardType="number-pad"
                setValue={setOTP}
              />
            )}

            <TouchableOpacity
              disabled={isLoading}
              onPress={
                isEmailConfirm
                  ? verifyUserEmailOTPAPI
                  : isNewUser
                  ? handleCreateUser
                  : handleJoinExisting
              }
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
                <ActivityIndicator color={Color.ThemeMain} />
              ) : (
                <Text
                  style={{ fontSize: 16, color: "#FFF", fontWeight: "600" }}
                >
                  {isEmailConfirm
                    ? "Verify OTP"
                    : isNewUser
                    ? "Create User"
                    : "Join Now"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                if (isEmailConfirm) {
                  setUserEmail("");
                  setUserName("");
                  setIsEmailConfirm(false);
                } else {
                  setIsNewUser(!isNewUser);
                }
              }}
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
                {isEmailConfirm
                  ? "Back"
                  : isNewUser
                  ? "Already Exist User"
                  : "New User"}
              </Text>
            </TouchableOpacity>
            {!isEmailConfirm && (
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
                <Text
                  style={{ fontSize: 16, color: "#fff", fontWeight: "600" }}
                >
                  {"Add Later! Skip..."}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default NewUserScreen;
