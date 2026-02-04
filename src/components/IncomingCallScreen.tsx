import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import CallAnswer from "../../asset/CallAnswer";
import CallEnd from "../../asset/CallEnd";
import { Color } from "../utils/colors";

interface IncomingCallScreenProps {
  otherUserId: string | null;
  otherUserName: string | null;
  onAccept: () => void;
  onCancel: () => void;
}

const IncomingCallScreen: React.FC<IncomingCallScreenProps> = ({
  otherUserId,
  otherUserName,
  onAccept,
  onCancel,
}) => (
  <View
    style={{
      flex: 1,
      justifyContent: "space-around",
      backgroundColor: "#050A0E",
    }}
  >
    <View
      style={{
        padding: 35,
        justifyContent: "center",
        alignItems: "center",
        borderRadius: 14,
      }}
    >
      <Text
        style={{
          fontSize: 24,
          fontWeight: "500",
          color: Color.ThemeMain,
          lineHeight: 30,
          letterSpacing: 6,
          textAlign: "center",
        }}
      >
        {`${otherUserName}\n${otherUserId}`}
      </Text>
      <Text
        style={{
          fontSize: 14,
          marginTop: 12,
          fontWeight: "400",
          color: Color.TitleGrey,
        }}
      >
        is calling..
      </Text>
    </View>
    <View
      style={{
        justifyContent: "center",
        alignItems: "center",
        gap: 40,
        flexDirection: "row",
      }}
    >
      <TouchableOpacity
        onPress={onCancel}
        style={{
          backgroundColor: "#FF5D5D",
          borderRadius: 30,
          height: 60,
          aspectRatio: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CallEnd width={50} height={12} />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onAccept}
        style={{
          backgroundColor: "green",
          borderRadius: 30,
          height: 60,
          aspectRatio: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <CallAnswer height={28} fill={"#fff"} />
      </TouchableOpacity>
    </View>
  </View>
);

export default IncomingCallScreen;
