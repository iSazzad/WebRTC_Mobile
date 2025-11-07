import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
  Platform,
} from "react-native";
import TextInputContainer from "./TextInputContainer";

interface JoinScreenProps {
  callerId: string;
  onJoin: () => void;
  setOtherUserId: (id: string) => void;
}

const JoinScreen: React.FC<JoinScreenProps> = ({
  callerId,
  onJoin,
  setOtherUserId,
}) => (
  <KeyboardAvoidingView
    behavior={Platform.OS === "ios" ? "padding" : "height"}
    style={{
      flex: 1,
      backgroundColor: "#050A0E",
      justifyContent: "center",
      paddingHorizontal: 42,
    }}
  >
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={{ flex: 1, justifyContent: "center" }}>
        <View
          style={{
            padding: 35,
            backgroundColor: "#1A1C22",
            justifyContent: "center",
            alignItems: "center",
            borderRadius: 14,
          }}
        >
          <Text style={{ fontSize: 18, color: "#D0D4DD" }}>Your Caller ID</Text>
          <Text
            style={{
              fontSize: 32,
              color: "#fff",
              letterSpacing: 6,
              marginTop: 12,
            }}
          >
            {callerId}
          </Text>
        </View>

        <View
          style={{
            backgroundColor: "#1A1C22",
            padding: 40,
            marginTop: 25,
            justifyContent: "center",
            borderRadius: 14,
          }}
        >
          <Text style={{ fontSize: 18, color: "#D0D4DD" }}>
            Enter call id of another user
          </Text>

          <TextInputContainer
            placeholder="Enter Caller ID"
            keyboardType="number-pad"
            setValue={setOtherUserId}
          />

          <TouchableOpacity
            onPress={onJoin}
            style={{
              height: 50,
              backgroundColor: "#5568FE",
              justifyContent: "center",
              alignItems: "center",
              borderRadius: 12,
              marginTop: 16,
            }}
          >
            <Text style={{ fontSize: 16, color: "#FFF" }}>Call Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableWithoutFeedback>
  </KeyboardAvoidingView>
);

export default JoinScreen;
