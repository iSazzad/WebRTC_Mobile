import React, { useCallback, useEffect, useRef, useState } from "react";
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
import JoinScreen from "../components/JoinScreen";
import OutgoingCallScreen from "../components/OutgoingCallScreen";
import IncomingCallScreen from "../components/IncomingCallScreen";
import WebrtcRoomScreen from "../components/WebrtcRoomScreen";
import { ICE_SERVERS, SIGNAL_URL } from "../config/webrtc";
import { UserModel } from "../api/user";
import EditProfileScreen from "../components/EditProfileScreen";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

type CallState =
  | "UPDATE_USER"
  | "JOIN"
  | "OUTGOING_CALL"
  | "INCOMING_CALL"
  | "WEBRTC_ROOM";

const DashboardScreen: React.FC = () => {
  const [callerId, setCallerId] = useState<string | null>(null);
  const [callState, setCallState] = useState<CallState>("UPDATE_USER");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [localCallType, setLocalCallType] = useState<"audio" | "video" | null>(
    null
  );
  const [remoteCallType, setRemoteCallType] = useState<
    "audio" | "video" | null
  >(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [callTime, setCallTime] = useState<Date | null>(null);
  const [userDetail, setUserDetail] = useState<UserModel>();

  const otherUserId = useRef<string | null>(null);
  const remoteRTCMessage = useRef<any>(null);
  const socket = useRef<Socket | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);

  const navigation = useNavigation();
  // Buffer for ICE candidates until remote description is set
  const remoteCandidates = useRef<RTCIceCandidate[]>([]);
  // Guard so negotiationneeded doesn't create multiple simultaneous offers
  const makingOffer = useRef(false);

  // Final createNewPeerConnection function
  const createNewPeerConnection = (): RTCPeerConnection => {
    const newPc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    console.log("PeerConnection created:", newPc);

    newPc.ontrack = (event: any) => {
      console.log(
        "Remote track event fired:",
        event.track?.kind,
        event.track?.id,
        event.streams?.map((s: any) => s.id)
      );
      setRemoteStream((prev: any) => {
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

    newPc.onicecandidate = (event: any) => {
      console.log("ICE candidate event fired:", event.candidate);
      if (!event.candidate) return;
      if (socket.current && otherUserId.current) {
        socket.current.emit("ICEcandidate", {
          calleeId: otherUserId.current,
          rtcMessage: event.candidate,
        });
      }
    };

    newPc.onicecandidateerror = (event: any) => {
      console.warn("ICE candidate error event fired:", event);
    };

    newPc.onconnectionstatechange = async () => {
      const state = newPc.connectionState;
      console.log("PeerConnection connectionStateChange event fired:", state);
      if (["disconnected", "failed"].includes(state)) {
        // Try ICE restart first
        try {
          const offer = await newPc.createOffer({ iceRestart: true });
          await newPc.setLocalDescription(offer);
          if (socket.current && otherUserId.current) {
            socket.current.emit("call", {
              calleeId: otherUserId.current,
              rtcMessage: offer,
            });
          }
          return; // wait to see if restart recovers
        } catch (e) {
          console.warn("ICE restart attempt failed:", e);
        }
      }
      if (["failed", "closed"].includes(state)) {
        try {
          newPc.close();
        } catch (e) {}
        pc.current = createNewPeerConnection();
        if (localStream) {
          localStream
            .getTracks()
            .forEach((track: any) => pc.current?.addTrack(track, localStream));
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
          offerToReceiveVideo: localCallType === "video",
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
  useFocusEffect(
    useCallback(() => {
      const loadCallerId = async () => {
        try {
          const user = await AsyncStorage.getItem("userDetails");
          if (user) {
            const userData: UserModel = JSON.parse(user);
            setCallerId(userData.userId);
            setUserDetail(userData);
            setCallState("JOIN");
          }
        } catch (error) {
          console.error("Error loading callerId:", error);
        }
      };
      loadCallerId();
    }, [])
  );

  // Setup socket and peer connection
  useEffect(() => {
    if (!callerId) return;

    // Create initial PeerConnection
    createNewPeerConnection();

    // Initialize socket
    socket.current = SocketIOClient(SIGNAL_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
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

          // Infer remote call type
          const hasVideo =
            pc.current.remoteDescription?.sdp.includes("m=video");
          const mediaType = hasVideo ? "video" : "audio";
          setRemoteCallType(mediaType);

          InCallManager.start({ media: mediaType });
          setCallTime(new Date());

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

    // Keep device awake defaults
    InCallManager.setKeepScreenOn(true);
    InCallManager.setForceSpeakerphoneOn(speakerEnabled);
    InCallManager.setSpeakerphoneOn(speakerEnabled);
    InCallManager.setMicrophoneMute(false);

    // Cleanup on unmount of this effect
    return () => {
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

  // Helper to get local media based on type
  const getLocalMedia = async (
    type: "audio" | "video"
  ): Promise<MediaStream> => {
    if (type === "audio") {
      return mediaDevices.getUserMedia({ audio: true, video: false });
    }
    return mediaDevices.getUserMedia({
      audio: true,
      video: {
        facingMode: "user",
        frameRate: 24,
        width: { ideal: 720 },
        height: { ideal: 1280 },
      },
    });
  };

  // Start outgoing call explicitly
  const startCall = async (type: "audio" | "video") => {
    if (!socket.current || !otherUserId.current) {
      Alert.alert("Missing callee", "Set the ID of the user you want to call.");
      return;
    }
    initiateCall(type);
    // Alert.alert(
    //   "Choose Call Type",
    //   "Do you want to make an audio or video call?",
    //   [
    //     { text: "Audio Call", onPress: () => initiateCall("audio") },
    //     { text: "Video Call", onPress: () => initiateCall("video") },
    //   ],
    //   { cancelable: true }
    // );
  };

  // Handle call initiation after type selection
  const initiateCall = async (type: "audio" | "video") => {
    setLocalCallType(type);
    setRemoteCallType(null);
    setCameraEnabled(type === "video");
    if (!pc.current || pc.current.connectionState === "closed") {
      createNewPeerConnection();
    }
    try {
      if (!pc.current) return;

      // Ensure local media matches type
      let stream = localStream;
      if (!stream) {
        stream = await getLocalMedia(type);
        setLocalStream(stream);
      } else {
        // If switching to audio-only, remove/stop video tracks
        if (type === "audio") {
          stream.getVideoTracks().forEach((t) => {
            t.stop();
            stream?.removeTrack(t);
          });
        }
      }

      // Attach tracks
      stream.getTracks().forEach((track) => {
        const alreadyAdded = pc
          .current!.getSenders()
          .some((sender) => sender.track && sender.track.id === track.id);
        if (!alreadyAdded) {
          pc.current!.addTrack(track, stream!);
        }
      });

      if (!makingOffer.current) {
        makingOffer.current = true;
        const offer = await pc.current.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: type === "video",
          voiceActivityDetection: true,
        });
        await pc.current.setLocalDescription(offer);
        socket.current!.emit("call", {
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
      // 1) Apply remote offer
      await pc.current.setRemoteDescription(
        new RTCSessionDescription(remoteRTCMessage.current)
      );

      // 2) Determine needed local media from offer
      const hasVideo = pc.current.remoteDescription?.sdp.includes("m=video");
      const neededType: "audio" | "video" = hasVideo ? "video" : "audio";
      setRemoteCallType(neededType);
      setCameraEnabled(neededType === "video");

      // 3) Ensure local media matches needed type and attach tracks
      let stream = localStream;
      if (!stream) {
        stream = await getLocalMedia(neededType);
        setLocalStream(stream);
        setLocalCallType(neededType);
      }
      stream.getTracks().forEach((track) => {
        const alreadyAdded = pc
          .current!.getSenders()
          .some((sender) => sender.track && sender.track.id === track.id);
        if (!alreadyAdded) pc.current!.addTrack(track, stream!);
      });

      // 4) Add buffered candidates
      await processBufferedCandidates();

      // 5) Create and send answer
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);
      socket.current.emit("answerCall", {
        callerId: otherUserId.current,
        rtcMessage: answer,
      });

      // 6) Start call UI/audio routing
      InCallManager.stopRingtone();
      InCallManager.start({ media: neededType });
      InCallManager.setForceSpeakerphoneOn(speakerEnabled);
      InCallManager.setMicrophoneMute(false);
      setCallTime(new Date());
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
  const stopLocalMedia = () => {
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
  };

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
      pc.current?.getSenders().forEach((s) => s.track && s.replaceTrack(null));
      pc.current?.close();
    } catch (e) {}
    setRemoteStream(null);
    setCallTime(null);
    setLocalCallType(null);
    setRemoteCallType(null);
    setCallState("JOIN");
    stopLocalMedia();
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
    localStream?.getVideoTracks().forEach((t: any) => (t.enabled = enabled));
    localStream?.get;
  };

  // Switch camera
  const switchCamera = () => {
    localStream?.getVideoTracks().forEach((t: any) => {
      if (typeof t._switchCamera === "function") t._switchCamera();
    });
  };

  const updateUserDetails = (userDetails: UserModel) => {
    if (userDetails.userId) {
      console.log("iser details: ", userDetail);

      setCallerId(userDetails.userId);
      setUserDetail(userDetails);
      setCallState("JOIN");
    }
  };

  const handleProfileAccount = () => {
    Alert.alert(
      "Account",
      undefined,
      [
        {
          text: "Edit Profile",
          onPress: () => {
            setCallState("UPDATE_USER");
          },
        },
        {
          text: "Logout",
          onPress: async () => {
            await AsyncStorage.removeItem("userDetails");
            navigation.goBack();
          },
        },
        {
          text: "Cancel",
          style: "cancel",
        },
      ],
      { cancelable: true }
    );
  };

  // UI: main switch
  switch (callState) {
    case "UPDATE_USER":
      return (
        <EditProfileScreen
          onJoin={updateUserDetails}
          user={userDetail!}
          onBack={() => {
            setCallState("JOIN");
          }}
        />
      );
    case "JOIN":
      return (
        <JoinScreen
          callerId={callerId!}
          onJoin={startCall}
          onTapAccount={handleProfileAccount}
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
          localCallType={localCallType}
          remoteCallType={remoteCallType}
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

export default DashboardScreen;
