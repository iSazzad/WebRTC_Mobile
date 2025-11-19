import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
  Alert,
} from "react-native";
import TextInputContainer from "./TextInputContainer";
import Feather from "react-native-vector-icons/Feather";
import FontAwesome from "react-native-vector-icons/FontAwesome";
import Clipboard from "@react-native-clipboard/clipboard";
import { Color } from "../utils/colors";
import { CallType } from "../screens/DashboardScreen";

interface JoinScreenProps {
  callerId: string;
  otherUserId: string;
  onJoin: (type: CallType) => void;
  onTapAccount: () => void;
  setOtherUserId: (id: string) => void;
}

const JoinScreen: React.FC<JoinScreenProps> = ({
  callerId,
  onJoin,
  otherUserId,
  onTapAccount,
  setOtherUserId,
}) => {
  const handleCopy = () => {
    Clipboard.setString(callerId);
    Alert.alert("Copied!", "Your Caller has been copied to clipboard.");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{
        flex: 1,
        backgroundColor: Color.ThemeMain,
        justifyContent: "center",
        paddingHorizontal: 24,
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
            onPress={onTapAccount}
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
              right: 0,
            }}
          >
            <FontAwesome name="user-circle-o" size={24} color={"#FFF"} />
          </TouchableOpacity>

          <View
            style={{
              padding: 20,
              backgroundColor: Color.PopUpBg,
              justifyContent: "center",
              alignItems: "center",
              borderRadius: 14,
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
                {callerId}
              </Text>
              <TouchableOpacity style={{ padding: 5 }} onPress={handleCopy}>
                <Feather name="copy" color={Color.White} size={20} />
              </TouchableOpacity>
            </View>
          </View>

          <View
            style={{
              backgroundColor: Color.PopUpBg,
              padding: 40,
              paddingVertical: 20,
              marginTop: 16,
              justifyContent: "center",
              borderRadius: 14,
              gap: 10,
            }}
          >
            <Text style={{ fontSize: 18, color: Color.TitleGrey }}>
              Enter call id of another user
            </Text>

            <TextInputContainer
              placeholder="Enter Caller ID"
              keyboardType="number-pad"
              setValue={setOtherUserId}
              value={otherUserId}
            />

            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 20,
                justifyContent: "center",
              }}
            >
              <TouchableOpacity
                onPress={() => onJoin("audio")}
                style={{
                  height: 50,
                  width: 50,
                  backgroundColor: Color.ThemeMain,
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: 12,
                  marginTop: 16,
                }}
              >
                <Feather name="phone-call" size={24} color={"#FFF"} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onJoin("video")}
                style={{
                  height: 50,
                  width: 50,
                  backgroundColor: Color.ThemeMain,
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: 12,
                  marginTop: 16,
                }}
              >
                <Feather name="video" size={24} color={"#FFF"} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

export default JoinScreen;
