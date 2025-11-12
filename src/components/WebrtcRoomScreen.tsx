import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { RTCView, MediaStream } from "react-native-webrtc";
import CameraSwitch from "../../asset/CameraSwitch";
import VideoOff from "../../asset/VideoOff";
import VideoOn from "../../asset/VideoOn";
import MicOn from "../../asset/MicOn";
import MicOff from "../../asset/MicOff";
import CallEnd from "../../asset/CallEnd";
import IconContainer from "./IconContainer";
import Feather from "react-native-vector-icons/Feather";
interface WebrtcRoomScreenProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localMicOn: boolean;
  otherUserId: string | null;
  localSpeakerOn: boolean;
  callTime: Date | null;
  localCallType: 'audio' | 'video' | null;
  remoteCallType: 'audio' | 'video' | null;
  localWebcamOn: boolean;
  onLeave: () => void;
  onToggleMic: () => void;
  onToggleSpeaker: () => void;
  onToggleCamera: () => void;
  onSwitchCamera: () => void;
}

const WebrtcRoomScreen: React.FC<WebrtcRoomScreenProps> = ({
  localStream,
  remoteStream,
  localMicOn,
  otherUserId,
  localWebcamOn,
  callTime,
  localCallType,
  remoteCallType,
  onLeave,
  onToggleMic,
  onToggleCamera,
  onSwitchCamera,
  localSpeakerOn,
  onToggleSpeaker,
}) => {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Update elapsed time every second based on callTime (start time)
  useEffect(() => {
    if (!callTime) {
      setElapsedSeconds(0);
      return;
    }
    const start = callTime.getTime();
    // initialize immediately
    setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    const id = setInterval(() => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - start) / 1000)));
    }, 1000);
    return () => clearInterval(id);
  }, [callTime]);

  const formatTime = () => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;
    const hour = hours > 0 ? `${String(hours).padStart(2, "0")}:` : "";
    return `${hour}${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
  };

  console.log("local type: ", localCallType, remoteStream);
  console.log("remote type: ", remoteCallType);

  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      {remoteCallType && remoteCallType == "video" && remoteStream ? (
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
          {remoteCallType && remoteStream ? (
            <Text style={{ color: "#FFF" }}>Talking with {otherUserId}</Text>
          ) : (
            <Text style={{ color: "#FFF" }}>Waiting for remote stream...</Text>
          )}
        </View>
      )}

      <Text
        style={{
          position: "absolute",
          top: 60,
          alignSelf: "center",
          color: "#FFF",
          fontSize: 16,
          zIndex: 1000,
          fontWeight: "600",
        }}
      >
        {formatTime()}
      </Text>

      {localCallType && localCallType == "video" && localStream && (
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
          mirror={!!(localCallType === "video" && localWebcamOn)}
        />
      )}
      {localCallType && localCallType == "video" && localStream && (
        <IconContainer
          style={[
            styles.borderIcon,
            { position: "absolute", top: 40, right: 20, borderWidth: 0 },
          ]}
          backgroundColor={"transparent"}
          onPress={onSwitchCamera}
          Icon={() => <CameraSwitch height={24} width={24} fill="#FFF" />}
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

        {/* Speaker Toggle */}
        <IconContainer
          style={styles.borderIcon}
          backgroundColor={localSpeakerOn ? "#FFF" : "transparent"}
          onPress={onToggleSpeaker}
          Icon={() => (
            <Feather
              name="volume-2"
              size={24}
              color={!localSpeakerOn ? "#FFF" : "#000"}
            />
          )}
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

        {/* Leave Call */}
        <IconContainer
          backgroundColor={"#FF4B5C"}
          onPress={onLeave}
          Icon={() => <CallEnd height={24} width={24} fill="#FFF" />}
        />
      </View>
    </View>
  );
};

export default WebrtcRoomScreen;

// 🎨 Styles
const styles = StyleSheet.create({
  borderIcon: {
    borderWidth: 1.5,
    borderColor: "#2B3034",
  },
  dropdownOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
    justifyContent: "flex-end",
    alignItems: "flex-end",
  },
  dropdownBackdrop: {
    position: "absolute",
    width: "100%",
    height: "100%",
    left: 0,
    top: 0,
    zIndex: 1,
  },
  dropdown: {
    backgroundColor: "#1A1C22",
    padding: 8,
    borderRadius: 10,
    marginRight: 150,
    marginBottom: 110,
    zIndex: 2,
    elevation: 6,
    minWidth: 110,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  dropdownText: {
    color: "#FFF",
    fontSize: 15,
    marginLeft: 7,
  },
});
