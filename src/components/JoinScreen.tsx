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
  onJoin: (type: CallType, id: string) => void;
  onClose: () => void;
  setOtherUserId: (id: string) => void;
}

const JoinScreen: React.FC<JoinScreenProps> = ({
  callerId,
  onJoin,
  otherUserId,
  onClose,
  setOtherUserId,
}) => {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{
        flex: 1,
        backgroundColor: Color.BGGrey,
        justifyContent: "center",
      }}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            paddingHorizontal: 24,
          }}
        >
          <TouchableOpacity
            onPress={onClose}
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
              backgroundColor: Color.ThemeMain,
              padding: 40,
              paddingVertical: 40,
              // marginTop: 16,
              justifyContent: "center",
              borderRadius: 14,
              gap: 10,
            }}
          >
            <Text
              style={{
                fontSize: 18,
                color: Color.TitleGrey,
                alignSelf: "center",
              }}
            >
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
                onPress={() => onJoin("audio", otherUserId)}
                style={{
                  height: 50,
                  width: 50,
                  backgroundColor: Color.PopUpBg,
                  justifyContent: "center",
                  alignItems: "center",
                  borderRadius: 12,
                  marginTop: 16,
                }}
              >
                <Feather name="phone-call" size={24} color={"#FFF"} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onJoin("video", otherUserId)}
                style={{
                  height: 50,
                  width: 50,
                  backgroundColor: Color.PopUpBg,
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
