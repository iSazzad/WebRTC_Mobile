import React, { useEffect, useRef, useState } from "react";
import {
  mediaDevices,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  MediaStream,
} from "react-native-webrtc";
import SocketIOClient, { Socket } from "socket.io-client";
import InCallManager from "react-native-incall-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Text, View } from "react-native";

// Components
import JoinScreen from "./components/JoinScreen";
import OutgoingCallScreen from "./components/OutgoingCallScreen";
import IncomingCallScreen from "./components/IncomingCallScreen";
import WebrtcRoomScreen from "./components/WebrtcRoomScreen";

type CallState = "JOIN" | "OUTGOING_CALL" | "INCOMING_CALL" | "WEBRTC_ROOM";

const STUN_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

const url = "http://192.168.0.115:3000";

const MainApp: React.FC = () => {
  const [callerId, setCallerId] = useState<string | null>(null);
  const [callState, setCallState] = useState<CallState>("JOIN");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [callerCallType, setCallerCallType] = useState<string | null>(null);
  const [calleeCallType, setCalleeCallType] = useState<string | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [callTime, setCallTime] = useState<Date | null>(null);

  const otherUserId = useRef<string | null>(null);
  const remoteRTCMessage = useRef<any>(null);
  const socket = useRef<Socket | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);

  // Buffer for ICE candidates until remote description is set
  const remoteCandidates = useRef<RTCIceCandidate[]>([]);
  // Guard so negotiationneeded doesn't create multiple simultaneous offers
  const makingOffer = useRef(false);

  // Final createNewPeerConnection function
  const createNewPeerConnection = (): RTCPeerConnection => {
    const newPc = new RTCPeerConnection({ iceServers: STUN_SERVERS });

    console.log("PeerConnection created:", newPc);

    newPc.ontrack = (event: any) => {
      console.log(
        "Remote track event fired:",
        event.track?.kind,
        event.track?.id,
        event.streams?.map((s) => s.id)
      );
      setRemoteStream((prev) => {
        if (prev) {
          try {
            prev.addTrack(event.track);
          } catch (err) {
            const ms = new MediaStream(prev.getTracks());
            ms.addTrack(event.track);
            return ms;
          }
          return prev;
        } else {
          return new MediaStream([event.track]);
        }
      });
    };

    newPc.onicecandidate = (event) => {
      console.log("ICE candidate event fired:", event.candidate);
      if (!event.candidate) return;
      if (socket.current && otherUserId.current) {
        socket.current.emit("ICEcandidate", {
          calleeId: otherUserId.current,
          rtcMessage: event.candidate,
        });
      }
    };

    newPc.onicecandidateerror = (event) => {
      console.warn("ICE candidate error event fired:", event);
    };

    newPc.onconnectionstatechange = () => {
      const state = newPc.connectionState;
      console.log("PeerConnection connectionStateChange event fired:", state);
      if (["disconnected", "failed", "closed"].includes(state)) {
        try {
          newPc.close();
        } catch (e) {}
        // Re-create PC and reattach local tracks
        pc.current = createNewPeerConnection();
        if (localStream) {
          localStream
            .getTracks()
            .forEach((track) => pc.current?.addTrack(track, localStream));
        }
      }
    };

    newPc.onsignalingstatechange = () => {
      console.log(
        "PeerConnection signalingStateChange event fired:",
        newPc.signalingState
      );
      if (newPc.signalingState === "closed") {
        console.log("PeerConnection signaling state closed");
      }
    };

    newPc.onnegotiationneeded = async () => {
      console.log("PeerConnection negotiationneeded event fired");
      if (!pc.current) return;
      if (makingOffer.current) return;
      makingOffer.current = true;
      try {
        const offer = await newPc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: callerCallType === "video",
          voiceActivityDetection: true,
        });
        await newPc.setLocalDescription(offer);
        if (socket.current && otherUserId.current) {
          socket.current.emit("call", {
            calleeId: otherUserId.current,
            rtcMessage: offer,
          });
          setCallState("OUTGOING_CALL");
        }
      } catch (err) {
        console.error("Error during negotiationneeded/createOffer:", err);
      } finally {
        makingOffer.current = false;
      }
    };

    pc.current = newPc;
    return newPc;
  };

  // Load or create caller ID
  useEffect(() => {
    const loadCallerId = async () => {
      try {
        let id = await AsyncStorage.getItem("callerId");
        if (!id) {
          id = Math.floor(100000 + Math.random() * 900000).toString();
          await AsyncStorage.setItem("callerId", id);
        }
        setCallerId(id);
      } catch (error) {
        console.error("Error loading callerId:", error);
      }
    };
    loadCallerId();
  }, []);

  // Setup socket, peer connection, and local media
  useEffect(() => {
    if (!callerId) return;

    // Create initial PeerConnection
    createNewPeerConnection();

    // Initialize socket (adjust server URL to your environment)
    socket.current = SocketIOClient(url, {
      transports: ["websocket"],
      query: { callerId },
    });
    const sock = socket.current;

    // --- Socket handlers ---
    const handleNewCall = (data: any) => {
      remoteRTCMessage.current = data.rtcMessage;
      otherUserId.current = data.callerId;
      try {
        InCallManager.startRingtone("_DEFAULT_", [1000, 1000], "playback", 30);
      } catch (err) {
        console.warn(
          "startRingtone failed (check InCallManager signature):",
          err
        );
      }
      InCallManager.setSpeakerphoneOn(speakerEnabled);
      setCallState("INCOMING_CALL");
    };

    const handleCallAnswered = async (data: any) => {
      remoteRTCMessage.current = data.rtcMessage;
      try {
        if (pc.current && remoteRTCMessage.current) {
          await pc.current.setRemoteDescription(
            new RTCSessionDescription(remoteRTCMessage.current)
          );
          await processBufferedCandidates();
          InCallManager.stopRingtone();

          // Check call type from the remote description
          const hasVideo =
            pc.current.remoteDescription?.sdp.includes("m=video");
          const mediaType = hasVideo ? "video" : "audio";

          // Start InCallManager with appropriate media type
          InCallManager.start({ media: mediaType });
          setCallTime(new Date());
          setCalleeCallType(mediaType);

          InCallManager.setForceSpeakerphoneOn(false);
          setSpeakerEnabled(false);

          InCallManager.setMicrophoneMute(false);
          setCallState("WEBRTC_ROOM");
        }
      } catch (err) {
        console.error("Error setting remote description on callAnswered:", err);
      }
    };

    const handleICEcandidate = async (data: any) => {
      const message = data?.rtcMessage;
      if (!message) return;
      try {
        const candidateObj = new RTCIceCandidate(message);
        if (!pc.current?.remoteDescription) {
          remoteCandidates.current.push(candidateObj);
          return;
        }
        await pc.current?.addIceCandidate(candidateObj);
        console.log("ICE candidate added");
      } catch (err) {
        console.error("Failed to add ICE candidate:", err);
      }
    };

    const handleCallCanceled = () => {
      console.log("Call canceled by caller");
      InCallManager.stopRingtone();
      setCallState("JOIN");
      otherUserId.current = null;
      remoteRTCMessage.current = null;
    };

    const handleCallRejected = () => {
      console.log("Call rejected by callee");
      setCallState("JOIN");
      InCallManager.stopRingtone();
      Alert.alert("Call Rejected", "The other user declined your call.");
      otherUserId.current = null;
      remoteRTCMessage.current = null;
    };

    const handleCallEnded = () => {
      console.log("Other user ended the call");
      Alert.alert("Call Ended", "The other user has disconnected.");
      InCallManager.stop();
      setCallState("JOIN");
      setRemoteStream(null);
      try {
        pc.current?.close();
      } catch (e) {}
      createNewPeerConnection();
    };

    sock.on("newCall", handleNewCall);
    sock.on("callAnswered", handleCallAnswered);
    sock.on("ICEcandidate", handleICEcandidate);
    sock.on("callCanceled", handleCallCanceled);
    sock.on("callRejected", handleCallRejected);
    sock.on("callEnded", handleCallEnded);

    // Get user media once
    let mounted = true;
    mediaDevices
      .getUserMedia({ audio: true, video: true })
      .then((stream: MediaStream) => {
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        console.log("localStream tracks:", stream.getTracks());
        setLocalStream(stream);
        // Attach tracks to existing peer connection
        if (pc.current) {
          stream.getTracks().forEach((track) => {
            console.log("Adding track:", track.kind, track.id, track.enabled);
            pc.current?.addTrack(track, stream);
          });
        }
      })
      .catch((err) => {
        console.error("getUserMedia error:", err);
      });

    // Keep device awake and speaker on during calls
    InCallManager.setKeepScreenOn(true);
    InCallManager.setForceSpeakerphoneOn(speakerEnabled);
    InCallManager.setSpeakerphoneOn(speakerEnabled);
    InCallManager.setMicrophoneMute(false);

    // Cleanup on unmount of this effect
    return () => {
      mounted = false;

      sock.off("newCall", handleNewCall);
      sock.off("callAnswered", handleCallAnswered);
      sock.off("ICEcandidate", handleICEcandidate);
      sock.off("callCanceled", handleCallCanceled);
      sock.off("callRejected", handleCallRejected);
      sock.off("callEnded", handleCallEnded);

      try {
        sock.disconnect();
      } catch (e) {}

      try {
        pc.current?.close();
      } catch (e) {}

      InCallManager.stop();
    };
  }, [callerId]);

  // Process buffered candidates
  const processBufferedCandidates = async () => {
    if (!pc.current) return;
    if (!remoteCandidates.current.length) return;
    const cands = [...remoteCandidates.current];
    remoteCandidates.current = [];
    for (const cand of cands) {
      try {
        await pc.current.addIceCandidate(cand);
      } catch (err) {
        console.warn("Failed to add buffered candidate:", err);
      }
    }
  };

  // Start outgoing call explicitly
  const startCall = async () => {
    if (!socket.current || !otherUserId.current) {
      Alert.alert("Missing callee", "Set the ID of the user you want to call.");
      return;
    }

    // Show dialog to choose call type
    Alert.alert(
      "Choose Call Type",
      "Do you want to make an audio or video call?",
      [
        {
          text: "Audio Call",
          onPress: () => initiateCall("audio"),
        },
        {
          text: "Video Call",
          onPress: () => initiateCall("video"),
        },
      ],
      { cancelable: true }
    );
  };

  // Handle call initiation after type selection
  const initiateCall = async (type: "audio" | "video") => {
    setCallerCallType(null);
    setCalleeCallType(type);
    if (!pc.current || pc.current.connectionState === "closed") {
      createNewPeerConnection();
    }
    try {
      if (!pc.current) return;
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          const alreadyAdded = pc.current
            .getSenders()
            .some((sender) => sender.track && sender.track.id === track.id);
          if (!alreadyAdded) {
            pc.current.addTrack(track, localStream);
          }
        });
      }
      if (!makingOffer.current) {
        makingOffer.current = true;
        const offer = await pc.current.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
          voiceActivityDetection: true,
        });
        await pc.current.setLocalDescription(offer);
        socket.current.emit("call", {
          calleeId: otherUserId.current,
          rtcMessage: offer,
        });
        setCallState("OUTGOING_CALL");
      }
    } catch (err) {
      console.error("startCall/createOffer error:", err);
    } finally {
      makingOffer.current = false;
    }
  };

  // Accept an incoming call
  const acceptCall = async () => {
    if (!pc.current || !socket.current || !remoteRTCMessage.current) return;
    try {
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          const alreadyAdded = pc.current
            .getSenders()
            .some((sender) => sender.track && sender.track.id === track.id);
          if (!alreadyAdded) {
            pc.current.addTrack(track, localStream);
          }
        });
      }
      await pc.current.setRemoteDescription(
        new RTCSessionDescription(remoteRTCMessage.current)
      );
      await processBufferedCandidates();
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);

      const hasVideo = pc.current.remoteDescription?.sdp.includes("m=video");
      const mediaType = hasVideo ? "video" : "audio";
      console.log("media type: ", hasVideo);

      socket.current.emit("answerCall", {
        callerId: otherUserId.current,
        rtcMessage: answer,
      });
      InCallManager.stopRingtone();
      InCallManager.start({ media: mediaType });
      InCallManager.setForceSpeakerphoneOn(speakerEnabled);
      InCallManager.setMicrophoneMute(false);
      setCallTime(new Date());
      setCalleeCallType(mediaType);
      setCallState("WEBRTC_ROOM");
    } catch (err) {
      console.error("acceptCall error:", err);
    }
  };

  // Handle remote candidate manually
  const handleRemoteCandidateManually = async (ice: any) => {
    if (!ice) return;
    try {
      const candidate = new RTCIceCandidate(ice);
      if (!pc.current?.remoteDescription) {
        remoteCandidates.current.push(candidate);
      } else {
        await pc.current.addIceCandidate(candidate);
      }
    } catch (err) {
      console.error("handleRemoteCandidateManually error:", err);
    }
  };

  // Leave/cancel/reject call
  const leaveCall = () => {
    if (socket.current && otherUserId.current) {
      if (callState === "OUTGOING_CALL") {
        socket.current.emit("cancelCall", { calleeId: otherUserId.current });
      } else if (callState === "INCOMING_CALL") {
        socket.current.emit("rejectCall", { callerId: otherUserId.current });
      } else if (callState === "WEBRTC_ROOM") {
        socket.current.emit("endCall", { calleeId: otherUserId.current });
      }
    }
    try {
      pc.current?.close();
    } catch (e) {}
    setRemoteStream(null);
    setCallTime(null);
    setCallerCallType(null);
    setCalleeCallType(null);
    setCallState("JOIN");
    InCallManager.stop();
    InCallManager.stopRingtone();
    otherUserId.current = null;
    remoteRTCMessage.current = null;
    createNewPeerConnection();
  };

  // Toggle mic
  const toggleMic = () => {
    const enabled = !micEnabled;
    setMicEnabled(enabled);
    localStream?.getAudioTracks().forEach((t) => (t.enabled = enabled));
    InCallManager.setMicrophoneMute(!enabled);
  };

  // Toggle Speaker
  const toggleSpeaker = () => {
    InCallManager.setSpeakerphoneOn(!speakerEnabled);
    setSpeakerEnabled(!speakerEnabled);
  };

  // Toggle camera
  const toggleCamera = () => {
    const enabled = !cameraEnabled;
    setCameraEnabled(enabled);
    localStream?.getVideoTracks().forEach((t) => (t.enabled = enabled));
    localStream?.get;
  };

  // Switch camera
  const switchCamera = () => {
    localStream?.getVideoTracks().forEach((t: any) => {
      if (typeof t._switchCamera === "function") t._switchCamera();
    });
  };

  // UI: loading
  if (!callerId) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#050A0E",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <Text style={{ color: "#FFF" }}>Loading Caller ID...</Text>
      </View>
    );
  }

  // UI: main switch
  switch (callState) {
    case "JOIN":
      return (
        <JoinScreen
          callerId={callerId}
          onJoin={startCall}
          setOtherUserId={(id: string) => (otherUserId.current = id)}
        />
      );
    case "OUTGOING_CALL":
      return (
        <OutgoingCallScreen
          otherUserId={otherUserId.current}
          onCancel={leaveCall}
        />
      );
    case "INCOMING_CALL":
      return (
        <IncomingCallScreen
          otherUserId={otherUserId.current}
          onAccept={acceptCall}
          onCancel={leaveCall}
        />
      );
    case "WEBRTC_ROOM":
      return (
        <WebrtcRoomScreen
          localStream={localStream}
          otherUserId={otherUserId.current}
          remoteStream={remoteStream}
          localMicOn={micEnabled}
          localWebcamOn={cameraEnabled}
          callTime={callTime}
          callerCallType={callerCallType}
          calleeCallType={calleeCallType}
          onLeave={leaveCall}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
          onSwitchCamera={switchCamera}
          localSpeakerOn={speakerEnabled}
          onToggleSpeaker={toggleSpeaker}
        />
      );
    default:
      return null;
  }
};

export default MainApp;
