import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { RTCView, MediaStream } from "react-native-webrtc";
import CameraSwitch from "../../asset/CameraSwitch";
import VideoOff from "../../asset/VideoOff";
import VideoOn from "../../asset/VideoOn";
import MicOn from "../../asset/MicOn";
import MicOff from "../../asset/MicOff";
import CallEnd from "../../asset/CallEnd";
import IconContainer from "./IconContainer";

interface WebrtcRoomScreenProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localMicOn: boolean;
  localWebcamOn: boolean;
  onLeave: () => void;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onSwitchCamera: () => void;
}

const WebrtcRoomScreen: React.FC<WebrtcRoomScreenProps> = ({
  localStream,
  remoteStream,
  localMicOn,
  localWebcamOn,
  onLeave,
  onToggleMic,
  onToggleCamera,
  onSwitchCamera,
}) => (
  <View style={{ flex: 1, backgroundColor: "#000" }}>
    {remoteStream ? (
      <RTCView
        streamURL={remoteStream.toURL()}
        style={{ flex: 1 }}
        objectFit="cover"
      />
    ) : (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#FFF" }}>Waiting for remote stream...</Text>
      </View>
    )}

    {localStream && (
      <RTCView
        streamURL={localStream.toURL()}
        style={{
          width: 120,
          height: 160,
          position: "absolute",
          top: 40,
          right: 20,
          borderRadius: 10,
        }}
        objectFit="cover"
      />
    )}

    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-around",
        backgroundColor: "#1A1C22",
        padding: 20,
      }}
    >
      <IconContainer
        backgroundColor={"#FF4B5C"}
        onPress={onLeave}
        Icon={() => <CallEnd height={26} width={26} fill="#FFF" />}
      />

      {/* Mic Toggle */}
      <IconContainer
        style={styles.borderIcon}
        backgroundColor={!localMicOn ? "#FFF" : "transparent"}
        onPress={onToggleMic}
        Icon={() =>
          localMicOn ? (
            <MicOn height={24} width={24} fill="#FFF" />
          ) : (
            <MicOff height={28} width={28} fill="#1D2939" />
          )
        }
      />

      {/* Camera Toggle */}
      <IconContainer
        style={styles.borderIcon}
        backgroundColor={!localWebcamOn ? "#FFF" : "transparent"}
        onPress={onToggleCamera}
        Icon={() =>
          localWebcamOn ? (
            <VideoOn height={24} width={24} fill="#FFF" />
          ) : (
            <VideoOff height={36} width={36} fill="#1D2939" />
          )
        }
      />

      {/* Switch Camera */}
      <IconContainer
        style={styles.borderIcon}
        backgroundColor={"transparent"}
        onPress={onSwitchCamera}
        Icon={() => <CameraSwitch height={24} width={24} fill="#FFF" />}
      />
    </View>
  </View>
);

export default WebrtcRoomScreen;

// 🎨 Styles
const styles = StyleSheet.create({
  borderIcon: {
    borderWidth: 1.5,
    borderColor: "#2B3034",
  },
});
