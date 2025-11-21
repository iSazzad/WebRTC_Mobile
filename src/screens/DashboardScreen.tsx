// DashboardScreen.tsx
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
import { Alert } from "react-native";
import uuid from "react-native-uuid";

// Components
import OutgoingCallScreen from "../components/OutgoingCallScreen";
import IncomingCallScreen from "../components/IncomingCallScreen";
import WebrtcRoomScreen from "../components/WebrtcRoomScreen";
import { ICE_SERVERS, SIGNAL_URL } from "../config/webrtc";
import { UserModel } from "../api/user";
import EditProfileScreen from "../components/EditProfileScreen";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import ContactListScreen from "../components/ContactListScreen";
import inCallManager from "react-native-incall-manager";
import RNCallKeep from "react-native-callkeep";

type CallState =
  | "UPDATE_USER"
  | "ALL_USERS"
  | "JOIN"
  | "OUTGOING_CALL"
  | "INCOMING_CALL"
  | "WEBRTC_ROOM";

export type CallType = "audio" | "video" | null;

const DashboardScreen: React.FC = () => {
  const [callerId, setCallerId] = useState<string | null>(null);
  const [callState, setCallState] = useState<CallState>("ALL_USERS");
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [localCallType, setLocalCallType] = useState<CallType>(null);
  const [remoteCallType, setRemoteCallType] = useState<CallType>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [micEnabled, setMicEnabled] = useState(true);
  const [cameraEnabled, setCameraEnabled] = useState(false); // default false -> audio only
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [callTime, setCallTime] = useState<Date | null>(null);
  const [userDetail, setUserDetail] = useState<UserModel>();

  // Keep a ref of callState so event handlers always see the latest value
  const callStateRef = useRef<CallState>("ALL_USERS");
  const deviceUUID = uuid.v4();

  const otherUserId = useRef<string | null>(null);
  const remoteRTCMessage = useRef<any>(null);
  const socket = useRef<Socket | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);

  const navigation = useNavigation();
  const remoteCandidates = useRef<RTCIceCandidate[]>([]);
  const makingOffer = useRef(false);
  // suppress automatic onnegotiationneeded when doing manual renegotiation
  const renegotiationInProgress = useRef(false);

  // keep callStateRef in sync with callState for use in RTC event handlers
  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // ---------- Peer connection creation ----------
  const createNewPeerConnection = (): RTCPeerConnection => {
    const newPc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    newPc.ontrack = (event: any) => {
      console.log("ontrack event kind=", event.track && event.track.kind);
      setRemoteStream((prev: any) => {
        // Always create a new MediaStream instance so React state updates and UI re-renders
        if (prev) {
          const existing =
            prev.getTracks && typeof prev.getTracks === "function"
              ? prev.getTracks()
              : [];
          const tracks = [...existing, event.track];
          return new MediaStream(tracks as any);
        }
        return new MediaStream([event.track]);
      });
    };

    newPc.onicecandidate = (event: any) => {
      if (!event.candidate) return;
      if (socket.current && otherUserId.current) {
        socket.current.emit("ICEcandidate", {
          calleeId: otherUserId.current,
          rtcMessage: event.candidate,
        });
      }
    };

    newPc.onconnectionstatechange = async () => {
      const state = newPc.connectionState;
      if (["disconnected", "failed"].includes(state)) {
        // try ICE restart
        try {
          const offer = await newPc.createOffer({ iceRestart: true });
          await newPc.setLocalDescription(offer);
          if (socket.current && otherUserId.current) {
            socket.current.emit("call", {
              calleeId: otherUserId.current,
              rtcMessage: offer,
            });
          }
          return;
        } catch (e) {
          console.warn("ICE restart failed", e);
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

    newPc.onnegotiationneeded = async () => {
      // If we're doing manual renegotiation (video upgrade/downgrade), skip the default auto-offer
      if (renegotiationInProgress.current) {
        return;
      }

      // When already in an active room we always use the explicit renegotiation
      // events (renegotiateOffer/renegotiateAnswer). If we emit a normal "call"
      // here, the other side will see it as a brand new incoming call instead of
      // an upgrade/downgrade of the current one.
      if (callStateRef.current === "WEBRTC_ROOM") {
        return;
      }

      if (!pc.current) return;
      if (makingOffer.current) return;
      makingOffer.current = true;
      try {
        const offer = await newPc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
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
        console.error("createOffer error", err);
      } finally {
        makingOffer.current = false;
      }
    };

    pc.current = newPc;
    return newPc;
  };

  // ---------- Caller ID load ----------
  useFocusEffect(
    useCallback(() => {
      const loadCallerId = async () => {
        try {
          const user = await AsyncStorage.getItem("userDetails");
          if (user) {
            const userData: UserModel = JSON.parse(user);
            setCallerId(userData.userId);
            setUserDetail(userData);
            setCallState("ALL_USERS");
          }
        } catch (error) {
          console.error("Error loading callerId:", error);
        }
      };
      loadCallerId();
    }, [])
  );

  // ---------- CallKeep setup ----------
  useEffect(() => {
    setupCallKeep();
  }, []);

  const setupCallKeep = async () => {
    const options = {
      ios: {
        appName: "WebRTCApp",
      },
      android: {
        alertTitle: "Permissions required",
        alertDescription:
          "This application needs to access your phone accounts",
        cancelButton: "Cancel",
        okButton: "ok",
        additionalPermissions: [],
      },
    };

    RNCallKeep.setup(options).then((accepted) => {
      console.log("RNCallKeep setup completed:", accepted);
    });
    await RNCallKeep.setAvailable(true);
  };

  // ---------- Socket & PC setup ----------
  useEffect(() => {
    if (!callerId) return;

    createNewPeerConnection();

    socket.current = SocketIOClient(SIGNAL_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      query: { callerId },
    });

    // const sock = socket.current;
    socket.current;

    // Attach listeners
    socket.current.on("newCall", handleNewCall);
    socket.current.on("callAnswered", handleCallAnswered);
    socket.current.on("ICEcandidate", handleICEcandidate);
    socket.current.on("callCanceled", handleCallCanceled);
    socket.current.on("callRejected", handleCallRejected);
    socket.current.on("callEnded", handleCallEnded);
    socket.current.on("endedVideo", handleOtherUserCameraEnded);

    socket.current.on("incomingMediaChangeRequest", handleRequestMediaUpgrade);
    socket.current.on("mediaChangeApproved", handleApproveMediaUpgrade);
    socket.current.on("mediaChangeRejected", handleRejectMediaUpgrade);

    socket.current.on("connect", () => {
      console.log("socket connected", socket.current?.id);
    });

    // Keep device awake defaults
    InCallManager.setKeepScreenOn(true);
    InCallManager.setForceSpeakerphoneOn(speakerEnabled);
    InCallManager.setSpeakerphoneOn(speakerEnabled);
    InCallManager.setMicrophoneMute(false);

    return () => {
      socket.current?.off("newCall", handleNewCall);
      socket.current?.off("callAnswered", handleCallAnswered);
      socket.current?.off("ICEcandidate", handleICEcandidate);
      socket.current?.off("callCanceled", handleCallCanceled);
      socket.current?.off("callRejected", handleCallRejected);
      socket.current?.off("callEnded", handleCallEnded);
      socket.current?.off(
        "incomingMediaChangeRequest",
        handleRequestMediaUpgrade
      );
      socket.current?.off("mediaChangeApproved", handleApproveMediaUpgrade);
      socket.current?.off("mediaChangeRejected", handleRejectMediaUpgrade);
      socket.current?.off("endedVideo", handleOtherUserCameraEnded);

      try {
        socket.current?.disconnect();
      } catch (e) {}

      try {
        pc.current?.close();
      } catch (e) {}

      InCallManager.stop();
    };
  }, [callerId]);

  useEffect(() => {
    const onAnswerCall = (data: any) => {
      acceptCall();
    };

    const onEndCall = (data: any) => {
      socket.current?.emit("rejectCall", { callerId: otherUserId.current });
      leaveCall();
    };

    RNCallKeep.addEventListener("answerCall", onAnswerCall);
    RNCallKeep.addEventListener("endCall", onEndCall);

    return () => {
      RNCallKeep.removeEventListener("answerCall", onAnswerCall);
      RNCallKeep.removeEventListener("endCall", onEndCall);
    };
  }, []);

  // ---------- socket handlers ----------
  const handleNewCall = (data: any) => {
    remoteRTCMessage.current = data.rtcMessage;
    otherUserId.current = data.callerId;
    try {
      InCallManager.startRingtone("_DEFAULT_", [1000, 1000], "playback", 30);
    } catch (err) {
      console.warn("startRingtone failed:", err);
    }
    RNCallKeep.displayIncomingCall(
      deviceUUID,
      "Unknown Caller",
      "WebRTCApp",
      undefined,
      true
    );
    InCallManager.setForceSpeakerphoneOn(true);
    InCallManager.setSpeakerphoneOn(false);
    setSpeakerEnabled(true);

    InCallManager.vibrate = true;
    setRemoteCallType(data.type);
    setLocalCallType(data.type);
    setCameraEnabled(data.type === "video");
    setCallState("INCOMING_CALL");
  };

  const handleCallAnswered = async (data: any) => {
    remoteRTCMessage.current = data.rtcMessage;
    try {
      if (pc.current && remoteRTCMessage.current) {
        InCallManager.stopRingback();

        await pc.current.setRemoteDescription(
          new RTCSessionDescription(remoteRTCMessage.current)
        );
        await processBufferedCandidates();

        console.log(
          "pc.current.remoteDescription?.sdp: ",
          pc.current.remoteDescription?.sdp
        );

        setRemoteCallType(data.type);
        setCameraEnabled(data.type === "video");
        setLocalCallType(data.type);

        InCallManager.start({ media: "video" });
        setCallTime(new Date());
        if (data.type === "video") {
          InCallManager.setForceSpeakerphoneOn(true);
          setSpeakerEnabled(true);
        } else {
          InCallManager.setForceSpeakerphoneOn(false);
          InCallManager.setSpeakerphoneOn(false);
          setSpeakerEnabled(false);
        }
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
    } catch (err) {
      console.error("Failed to add ICE candidate:", err);
    }
  };

  const handleCallCanceled = () => {
    InCallManager.stopRingback();
    InCallManager.stopRingtone();
    setCallState("ALL_USERS");
    otherUserId.current = null;
    remoteRTCMessage.current = null;
  };

  const handleCallRejected = () => {
    InCallManager.stopRingback();
    setCallState("ALL_USERS");
    InCallManager.stopRingtone();
    Alert.alert("Call Rejected", "The other user declined your call.");
    otherUserId.current = null;
    remoteRTCMessage.current = null;
  };

  const handleCallEnded = () => {
    Alert.alert("Call Ended", "The other user has disconnected.");
    InCallManager.stop();
    setCallState("ALL_USERS");
    setRemoteStream(null);
    try {
      pc.current?.close();
    } catch (e) {}
    createNewPeerConnection();
  };

  const handleOtherUserCameraEnded = (data: any) => {
    const { calleeId: fromCaller } = data;

    Alert.alert("User Camera Off", `${fromCaller} disabled camera.`, [
      {
        text: "OK",
        onPress: async () => {
          setRemoteCallType("audio");
        },
      },
    ]);
  };

  // --- Video upgrade specific handlers ---
  const handleRequestMediaUpgrade = (data: any) => {
    const { callerId: fromCaller } = data;
    Alert.alert(
      "Video request",
      `${fromCaller} wants to switch to video. Accept?`,
      [
        {
          text: "Reject",
          style: "cancel",
          onPress: () => {
            socket.current?.emit("rejectMediaChange", {
              callerId: fromCaller,
              type: "video",
            });
          },
        },
        {
          text: "Accept",
          onPress: async () => {
            setLocalCallType("video");
            setRemoteCallType("video");
            setCameraEnabled(true);

            socket.current?.emit("approveMediaChange", {
              callerId: fromCaller,
              type: "video",
            });
          },
        },
      ],
      { cancelable: false }
    );
  };

  const handleApproveMediaUpgrade = async (data: any) => {
    console.log("media change approved payload=", data);
    setRemoteCallType("video");
    setLocalCallType("video");
    setCameraEnabled(true);
  };

  const handleRejectMediaUpgrade = (data: any) => {
    Alert.alert(
      "Video request denied",
      "The other user declined video upgrade."
    );
  };

  // ---------- Process buffered ICE candidates ----------
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

  // ---------- get local media ----------
  const getLocalMedia = async (): Promise<MediaStream> => {
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

  // ---------- initiate call ----------
  const startCall = async (type: CallType) => {
    if (!socket.current || !otherUserId.current) {
      Alert.alert("Missing callee", "Set the ID of the user you want to call.");
      return;
    }
    initiateCall(type);
  };

  const initiateCall = async (type: CallType) => {
    setLocalCallType(type);
    setRemoteCallType(null);
    setCameraEnabled(type === "video");

    if (type === "video") {
      InCallManager.setForceSpeakerphoneOn(true);
      InCallManager.setSpeakerphoneOn(false);
      setSpeakerEnabled(true);
    } else {
      InCallManager.setForceSpeakerphoneOn(false);
      InCallManager.setSpeakerphoneOn(false);
      setSpeakerEnabled(false);
    }

    if (!pc.current || pc.current.connectionState === "closed") {
      createNewPeerConnection();
    }
    try {
      if (!pc.current) return;
      let stream = localStream;
      if (!stream) {
        stream = await getLocalMedia();
        setLocalStream(stream);
      } else {
        if (type === "audio") {
          stream.getVideoTracks().forEach((t) => {
            t.stop();
            stream?.removeTrack(t);
          });
        }
      }

      stream.getTracks().forEach((track) => {
        const alreadyAdded = pc
          .current!.getSenders()
          .some((sender) => sender.track && sender.track.id === track.id);
        if (!alreadyAdded) {
          pc.current!.addTrack(track, stream!);
        }
      });

      if (!makingOffer.current) {
        InCallManager.startRingback("_DEFAULT_");
        makingOffer.current = true;
        const offer = await pc.current.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
          voiceActivityDetection: true,
        });
        await pc.current.setLocalDescription(offer);
        socket.current!.emit("call", {
          calleeId: otherUserId.current,
          rtcMessage: offer,
          type,
        });
        setCallState("OUTGOING_CALL");
      }
    } catch (err) {
      console.error("startCall/createOffer error:", err);
    } finally {
      makingOffer.current = false;
    }
  };

  // ---------- accept incoming call ----------
  const acceptCall = async () => {
    if (!pc.current || !socket.current || !remoteRTCMessage.current) return;
    try {
      await pc.current.setRemoteDescription(
        new RTCSessionDescription(remoteRTCMessage.current)
      );

      // const hasVideo = pc.current.remoteDescription?.sdp.includes("m=video");
      // const neededType: "audio" | "video" = hasVideo ? "video" : "audio";
      // setRemoteCallType(neededType);
      // setCameraEnabled(neededType === "video");

      let stream = localStream;
      if (!stream) {
        stream = await getLocalMedia();
        setLocalStream(stream);
        // setLocalCallType(neededType);
      }
      stream.getTracks().forEach((track) => {
        const alreadyAdded = pc
          .current!.getSenders()
          .some((sender) => sender.track && sender.track.id === track.id);
        if (!alreadyAdded) pc.current!.addTrack(track, stream!);
      });

      await processBufferedCandidates();

      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);
      socket.current.emit("answerCall", {
        callerId: otherUserId.current,
        rtcMessage: answer,
        type: localCallType,
      });

      InCallManager.stopRingtone();
      InCallManager.start({ media: "video" });

      if (localCallType === "video") {
        InCallManager.setForceSpeakerphoneOn(true);
        setSpeakerEnabled(true);
      } else {
        InCallManager.setForceSpeakerphoneOn(false);
        InCallManager.setSpeakerphoneOn(false);
        setSpeakerEnabled(false);
      }

      InCallManager.setMicrophoneMute(false);

      setCallTime(new Date());
      setCallState("WEBRTC_ROOM");
    } catch (err) {
      console.error("acceptCall error:", err);
    }
  };

  // Called by user to request other party to accept video
  const requestVideoUpgrade = () => {
    if (!socket.current || !otherUserId.current) return;
    socket.current.emit("requestMediaChange", {
      calleeId: otherUserId.current,
      type: "video",
    });
  };

  // toggleCamera now requests/accepts appropriately
  const toggleCamera = async () => {
    if (!cameraEnabled) {
      requestVideoUpgrade();
    } else {
      setLocalCallType("audio");
      setCameraEnabled(!cameraEnabled);
      socket.current?.emit("endVideo", {
        callerId: otherUserId.current,
        type: "audio",
      });
    }
  };

  const stopLocalMedia = () => {
    localStream?.getTracks().forEach((t: any) => t.stop());
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
      pc.current
        ?.getSenders()
        .forEach((s) => s.track && s.replaceTrack(null as any));
      pc.current?.close();
    } catch (e) {}

    setRemoteStream(null);
    setCallTime(null);
    setLocalCallType(null);
    setRemoteCallType(null);
    setCallState("ALL_USERS");
    stopLocalMedia();
    InCallManager.stop();
    InCallManager.stopRingtone();
    otherUserId.current = null;
    remoteRTCMessage.current = null;
    createNewPeerConnection();
  };

  // ---------- update user details & UI switch ----------
  const updateUserDetails = (userDetails: UserModel) => {
    if (userDetails.userId) {
      setCallerId(userDetails.userId);
      setUserDetail(userDetails);
      setCallState("ALL_USERS");
    }
  };

  /**
   *
   */
  const handleProfileAccount = () => {
    Alert.alert(
      "Account",
      undefined,
      [
        { text: "Edit Profile", onPress: () => setCallState("UPDATE_USER") },
        {
          text: "Logout",
          onPress: async () => {
            await AsyncStorage.removeItem("userDetails");
            // @ts-ignore
            navigation.goBack();
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
      { cancelable: true }
    );
  };

  // ---------- Render UI based on callState ----------
  switch (callState) {
    case "UPDATE_USER":
      return (
        <EditProfileScreen
          onJoin={updateUserDetails}
          user={userDetail!}
          onBack={() => setCallState("ALL_USERS")}
        />
      );
    case "ALL_USERS":
      return (
        <ContactListScreen
          onJoin={(user, type: CallType) => {
            otherUserId.current = user.userId;
            startCall(type);
          }}
          onTapAccount={handleProfileAccount}
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
          onToggleMic={() => {
            const enabled = !micEnabled;
            setMicEnabled(enabled);
            localStream?.getAudioTracks().forEach((t) => (t.enabled = enabled));
            InCallManager.setMicrophoneMute(!enabled);
          }}
          onToggleCamera={toggleCamera}
          onSwitchCamera={() => {
            localStream?.getVideoTracks().forEach((t: any) => {
              if (typeof t._switchCamera === "function") t._switchCamera();
            });
          }}
          localSpeakerOn={speakerEnabled}
          onToggleSpeaker={() => {
            inCallManager.setKeepScreenOn(!speakerEnabled);
            // InCallManager.setSpeakerphoneOn(!speakerEnabled);
            InCallManager.setForceSpeakerphoneOn(!speakerEnabled);
            setSpeakerEnabled(!speakerEnabled);
          }}
        />
      );
    default:
      return null;
  }
};

export default DashboardScreen;
