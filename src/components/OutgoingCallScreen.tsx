import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import CallEnd from "../../asset/CallEnd";
import { Color } from "../utils/colors";
interface OutgoingCallScreenProps {
  otherUserId: string | null;
  otherUserName: string | null;
  onCancel: () => void;
}

const OutgoingCallScreen: React.FC<OutgoingCallScreenProps> = ({
  otherUserId,
  otherUserName,
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
          fontSize: 16,
          fontWeight: "400",
          color: Color.TitleGrey,
        }}
      >
        Calling to...
      </Text>

      <Text
        style={{
          fontSize: 24,
          fontWeight: "500",
          marginTop: 12,
          color: Color.ThemeMain,
          lineHeight: 30,
          letterSpacing: 6,
          textAlign: "center",
        }}
      >
        {`${otherUserName}\n${otherUserId}`}
      </Text>
    </View>
    <View
      style={{
        justifyContent: "center",
        alignItems: "center",
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
    </View>
  </View>
);

export default OutgoingCallScreen;
