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
import { useFocusEffect } from "@react-navigation/native";
import { ICE_SERVERS, SIGNAL_URL } from "../config/webrtc";
import { UserModel } from "../api/user";

export type CallState =
  | "UPDATE_USER"
  | "JOIN"
  | "OUTGOING_CALL"
  | "INCOMING_CALL"
  | "WEBRTC_ROOM";

export interface UseWebRTCCallResult {
  callerId: string | null;
  callState: CallState;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localCallType: "audio" | "video" | null;
  remoteCallType: "audio" | "video" | null;
  micEnabled: boolean;
  cameraEnabled: boolean;
  speakerEnabled: boolean;
  callTime: Date | null;
  userDetail?: UserModel;
  otherUserId: string | null;

  // actions
  setOtherUserId: (id: string | null) => void;
  updateUserDetails: (userDetails: UserModel) => void;
  startCall: (type: "audio" | "video") => Promise<void>;
  acceptCall: () => Promise<void>;
  leaveCall: () => void;
  toggleMic: () => void;
  toggleCamera: () => Promise<void>;
  switchCamera: () => void;
  toggleSpeaker: () => void;
  goToUpdateUser: () => void;
  goToJoin: () => void;
}

export const useWebRTCCall = (): UseWebRTCCallResult => {
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
  const [cameraEnabled, setCameraEnabled] = useState(false); // default false -> audio only
  const [speakerEnabled, setSpeakerEnabled] = useState(false);
  const [callTime, setCallTime] = useState<Date | null>(null);
  const [userDetail, setUserDetail] = useState<UserModel>();

  // Keep a ref of callState so event handlers always see the latest value
  const callStateRef = useRef<CallState>("UPDATE_USER");

  const otherUserIdRef = useRef<string | null>(null);
  const remoteRTCMessage = useRef<any>(null);
  const socket = useRef<Socket | null>(null);
  const pc = useRef<RTCPeerConnection | null>(null);
  const remoteCandidates = useRef<RTCIceCandidate[]>([]);
  const makingOffer = useRef(false);
  // suppress automatic onnegotiationneeded when doing manual renegotiation
  const renegotiationInProgress = useRef(false);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  // ---------- Peer connection creation ----------
  const createNewPeerConnection = (): RTCPeerConnection => {
    const newPc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    newPc.ontrack = (event: any) => {
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
      if (!event.candidate) return;
      if (socket.current && otherUserIdRef.current) {
        socket.current.emit("ICEcandidate", {
          calleeId: otherUserIdRef.current,
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
          if (socket.current && otherUserIdRef.current) {
            socket.current.emit("call", {
              calleeId: otherUserIdRef.current,
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
          offerToReceiveVideo: localCallType === "video",
        });
        await newPc.setLocalDescription(offer);
        if (socket.current && otherUserIdRef.current) {
          socket.current.emit("call", {
            calleeId: otherUserIdRef.current,
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
            setCallState("JOIN");
          }
        } catch (error) {
          console.error("Error loading callerId:", error);
        }
      };
      loadCallerId();
    }, [])
  );

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

    const sock = socket.current;

    // ---------- socket handlers ----------
    const handleNewCall = (data: any) => {
      remoteRTCMessage.current = data.rtcMessage;
      otherUserIdRef.current = data.callerId;
      try {
        InCallManager.startRingtone("_DEFAULT_", [1000, 1000], "playback", 30);
      } catch (err) {
        console.warn("startRingtone failed:", err);
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
      } catch (err) {
        console.error("Failed to add ICE candidate:", err);
      }
    };

    const handleCallCanceled = () => {
      InCallManager.stopRingtone();
      setCallState("JOIN");
      otherUserIdRef.current = null;
      remoteRTCMessage.current = null;
    };

    const handleCallRejected = () => {
      setCallState("JOIN");
      InCallManager.stopRingtone();
      Alert.alert("Call Rejected", "The other user declined your call.");
      otherUserIdRef.current = null;
      remoteRTCMessage.current = null;
    };

    const handleCallEnded = () => {
      Alert.alert("Call Ended", "The other user has disconnected.");
      InCallManager.stop();
      setCallState("JOIN");
      setRemoteStream(null);
      try {
        pc.current?.close();
      } catch (e) {}
      createNewPeerConnection();
    };

    // --- Video upgrade specific handlers ---
    const handleRequestMediaUpgrade = (data: any) => {
      const { callerId: fromCaller, type } = data;
      // Show a prompt to accept/reject
      Alert.alert(
        "Video request",
        `${fromCaller} wants to switch to video. Accept?`,
        [
          {
            text: "Reject",
            style: "cancel",
            onPress: () => {
              sock.emit("rejectMediaChange", { callerId: fromCaller, type });
            },
          },
          {
            text: "Accept",
            onPress: async () => {
              try {
                // Ensure our own camera is enabled on the callee side
                let stream = localStream;
                if (!stream || stream.getVideoTracks().length === 0) {
                  stream = await getLocalMedia(type);
                  setLocalStream(stream);
                  setLocalCallType(type);
                  setCameraEnabled(type === "video");
                }

                if (pc.current && stream) {
                  stream.getTracks().forEach((track) => {
                    const alreadyAdded = pc
                      .current!.getSenders()
                      .some((s) => s.track && s.track.id === track.id);
                    if (!alreadyAdded) {
                      pc.current!.addTrack(track, stream!);
                    }
                  });
                }

                // Inform caller we accept; caller will drive renegotiation
                sock.emit("approveMediaChange", {
                  callerId: fromCaller,
                  type,
                });
              } catch (err) {
                console.error(
                  "Error enabling local video on upgrade accept:",
                  err
                );
                Alert.alert(
                  "Camera error",
                  "Unable to enable your camera for the video call."
                );
                sock.emit("rejectMediaChange", { callerId: fromCaller, type });
              }
            },
          },
        ],
        { cancelable: false }
      );
    };

    const handleApproveMediaUpgrade = async (data: any) => {
      // The callee approved — caller should start manual renegotiation upgrade
      // Caller will create a manual offer and send it as a renegotiation offer
      console.log("video upgrade approved by", data.calleeId);
      await upgradeToVideo(data.calleeId);
    };

    const handleRejectMediaUpgrade = (data: any) => {
      // callee rejected
      Alert.alert(
        "Video request denied",
        "The other user declined video upgrade."
      );
    };

    // Attach listeners
    sock.on("newCall", handleNewCall);
    sock.on("callAnswered", handleCallAnswered);
    sock.on("ICEcandidate", handleICEcandidate);
    sock.on("callCanceled", handleCallCanceled);
    sock.on("callRejected", handleCallRejected);
    sock.on("callEnded", handleCallEnded);

    sock.on("incomingMediaChangeRequest", handleRequestMediaUpgrade);
    sock.on("mediaChangeApproved", handleApproveMediaUpgrade);
    sock.on("mediaChangeRejected", handleRejectMediaUpgrade);
    sock.on("renegotiateOffer", handleRenegotiateOffer);
    sock.on("renegotiateAnswer", handleRenegotiateAnswer);

    sock.on("connect", () => {
      console.log("socket connected", sock.id);
    });

    // Keep device awake defaults
    InCallManager.setKeepScreenOn(true);
    InCallManager.setForceSpeakerphoneOn(speakerEnabled);
    InCallManager.setSpeakerphoneOn(speakerEnabled);
    InCallManager.setMicrophoneMute(false);

    return () => {
      sock.off("newCall", handleNewCall);
      sock.off("callAnswered", handleCallAnswered);
      sock.off("ICEcandidate", handleICEcandidate);
      sock.off("callCanceled", handleCallCanceled);
      sock.off("callRejected", handleCallRejected);
      sock.off("callEnded", handleCallEnded);
      sock.off("incomingMediaChangeRequest", handleRequestMediaUpgrade);
      sock.off("mediaChangeApproved", handleApproveMediaUpgrade);
      sock.off("mediaChangeRejected", handleRejectMediaUpgrade);
      sock.off("renegotiateOffer", handleRenegotiateOffer);
      sock.off("renegotiateAnswer", handleRenegotiateAnswer);

      try {
        sock.disconnect();
      } catch (e) {}

      try {
        pc.current?.close();
      } catch (e) {}

      InCallManager.stop();
    };
  }, [callerId, speakerEnabled, localStream]);

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

  // ---------- Manual renegotiation handlers ----------
  // Callee: receives offer, sets remote, ensures local tracks, creates answer
  const handleRenegotiateOffer = async (data: any) => {
    const { from: callerId, rtcMessage } = data; // server forwarded { from, rtcMessage }
    try {
      if (!pc.current) return;

      // 1) set remote description (the caller's new offer)
      await pc.current.setRemoteDescription(
        new RTCSessionDescription(rtcMessage)
      );

      // 2) If caller requested audio->video and we don't have a camera, get one
      //    (we can't perfectly detect request type here; assume remote added video)
      let stream = localStream;
      if (!stream || stream.getVideoTracks().length === 0) {
        try {
          stream = await getLocalMedia("video");
          setLocalStream(stream);
          setCameraEnabled(true);
          setLocalCallType("video");
        } catch (err) {
          // cannot provide camera -> reject upgrade
          socket.current?.emit("mediaChangeRejected", {
            remoteId: callerId,
            type: "audioToVideo",
          });
          return;
        }
      }

      // 3) Add any new tracks we don't already have added to pc
      stream.getTracks().forEach((track) => {
        const alreadyAdded = pc
          .current!.getSenders()
          .some((s) => s.track && s.track.id === track.id);
        if (!alreadyAdded) pc.current!.addTrack(track, stream!);
      });

      await processBufferedCandidates();

      renegotiationInProgress.current = true;
      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);

      socket.current?.emit("renegotiateAnswer", {
        remoteId: callerId,
        rtcMessage: answer,
      });
    } catch (err) {
      console.error("handleRenegotiateOffer error", err);
    } finally {
      setTimeout(() => (renegotiationInProgress.current = false), 300);
    }
  };

  // Caller: receives answer and sets remote description
  const handleRenegotiateAnswer = async (data: any) => {
    const { from: calleeId, rtcMessage } = data;
    try {
      if (!pc.current) return;
      await pc.current.setRemoteDescription(
        new RTCSessionDescription(rtcMessage)
      );
      await processBufferedCandidates();
      // remote's tracks should now arrive
    } catch (err) {
      console.error("handleRenegotiateAnswer error", err);
    }
  };

  // ---------- get local media ----------
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

  // ---------- initiate call ----------
  const startCall = async (type: "audio" | "video") => {
    if (!socket.current || !otherUserIdRef.current) {
      Alert.alert("Missing callee", "Set the ID of the user you want to call.");
      return;
    }
    await initiateCall(type);
  };

  const initiateCall = async (type: "audio" | "video") => {
    setLocalCallType(type);
    setRemoteCallType(null);
    setCameraEnabled(type === "video");
    if (!pc.current || pc.current.connectionState === "closed") {
      createNewPeerConnection();
    }
    try {
      if (!pc.current) return;

      let stream = localStream;
      if (!stream) {
        stream = await getLocalMedia(type);
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
        makingOffer.current = true;
        const offer = await pc.current.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: type === "video",
          voiceActivityDetection: true,
        });
        await pc.current.setLocalDescription(offer);
        socket.current!.emit("call", {
          calleeId: otherUserIdRef.current,
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

  // ---------- accept incoming call ----------
  const acceptCall = async () => {
    if (!pc.current || !socket.current || !remoteRTCMessage.current) return;
    try {
      await pc.current.setRemoteDescription(
        new RTCSessionDescription(remoteRTCMessage.current)
      );

      const hasVideo = pc.current.remoteDescription?.sdp.includes("m=video");
      const neededType: "audio" | "video" = hasVideo ? "video" : "audio";
      setRemoteCallType(neededType);
      setCameraEnabled(neededType === "video");

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

      await processBufferedCandidates();

      const answer = await pc.current.createAnswer();
      await pc.current.setLocalDescription(answer);
      socket.current.emit("answerCall", {
        callerId: otherUserIdRef.current,
        rtcMessage: answer,
      });

      InCallManager.stopRingtone();
      InCallManager.start({ media: neededType });
      InCallManager.setForceSpeakerphoneOn(false);
      InCallManager.setMicrophoneMute(false);
      setCallTime(new Date());
      setCallState("WEBRTC_ROOM");
    } catch (err) {
      console.error("acceptCall error:", err);
    }
  };

  // ---------- upgradeToVideo & downgradeToAudio ----------
  const upgradeToVideo = async (targetRemoteId?: string) => {
    if (!pc.current || !socket.current) return;
    const remoteId = targetRemoteId ?? otherUserIdRef.current;
    try {
      // 1) Prevent automatic onnegotiationneeded from firing
      renegotiationInProgress.current = true;

      // 2) Ensure we have a camera track and add/replace it BEFORE creating offer
      const camStream = await mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      const newVideoTrack = camStream.getVideoTracks()[0];
      if (!newVideoTrack) {
        Alert.alert("Camera error", "Unable to get camera track");
        return;
      }

      // Replace existing video sender or add track
      const videoSender = pc.current
        .getSenders()
        .find((s: any) => s.track && s.track.kind === "video");
      if (videoSender) {
        await videoSender.replaceTrack(newVideoTrack);
      } else {
        // prefer to replace audio sender if want simulcast; otherwise add
        const audioSender = pc.current
          .getSenders()
          .find((s: any) => s.track && s.track.kind === "audio");
        if (audioSender) {
          await audioSender.replaceTrack(newVideoTrack as any);
        } else {
          pc.current.addTrack(newVideoTrack, camStream as any);
        }
      }

      // update local stream state (so UI shows local camera)
      setLocalStream((prev) => {
        const baseTracks = prev ? prev.getTracks() : [];
        const newStream = new MediaStream(baseTracks as any);
        newStream.addTrack(newVideoTrack);
        return newStream;
      });
      setCameraEnabled(true);
      setLocalCallType("video");

      // 3) Manually create offer and send via dedicated renegotiate event
      const offer = await pc.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.current.setLocalDescription(offer);

      socket.current.emit("renegotiateOffer", {
        remoteId,
        rtcMessage: offer,
      });
    } catch (err) {
      console.error("upgradeToVideo error", err);
    } finally {
      // allow a little time for onnegotiationneeded suppression to settle
      setTimeout(() => (renegotiationInProgress.current = false), 300);
    }
  };

  const downgradeToAudio = async () => {
    if (!pc.current || !socket.current || !otherUserIdRef.current) return;
    try {
      renegotiationInProgress.current = true;

      // stop local video tracks
      localStream?.getVideoTracks().forEach((t) => t.stop());

      // replace video sender with null
      const videoSender = pc.current
        .getSenders()
        .find((s) => s.track && s.track.kind === "video");
      if (videoSender) {
        await videoSender.replaceTrack(null as any);
      }

      setCameraEnabled(false);
      setLocalCallType("audio");

      // Create manual offer indicating we no longer want video (offerToReceiveVideo: false)
      const offer = await pc.current.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: false,
      });
      await pc.current.setLocalDescription(offer);

      socket.current.emit("renegotiateOffer", {
        remoteId: otherUserIdRef.current,
        rtcMessage: offer,
      });
    } catch (err) {
      console.error("downgradeToAudio error", err);
    } finally {
      setTimeout(() => (renegotiationInProgress.current = false), 300);
    }
  };

  // Called by user to request other party to accept video
  const requestVideoUpgrade = () => {
    if (!socket.current || !otherUserIdRef.current) return;
    socket.current.emit("requestMediaChange", {
      calleeId: otherUserIdRef.current,
      type: "video",
    });
  };

  // toggleCamera now requests/accepts appropriately
  const toggleCamera = async () => {
    if (!cameraEnabled) {
      // currently audio-only -> request upgrade (request + wait for approval flow)
      requestVideoUpgrade();
      // optionally show local UI that request is sent (toast/spinner)
    } else {
      // currently video -> downgrade to audio immediately
      await downgradeToAudio();
      // notify other side optionally (not required if you want implicit)
      if (socket.current && otherUserIdRef.current) {
        socket.current.emit("endVideo", { calleeId: otherUserIdRef.current });
      }
    }
  };

  // ---------- rest of helpers ----------
  const stopLocalMedia = () => {
    localStream?.getTracks().forEach((t) => t.stop());
    setLocalStream(null);
  };

  const leaveCall = () => {
    if (socket.current && otherUserIdRef.current) {
      if (callState === "OUTGOING_CALL") {
        socket.current.emit("cancelCall", { calleeId: otherUserIdRef.current });
      } else if (callState === "INCOMING_CALL") {
        socket.current.emit("rejectCall", { callerId: otherUserIdRef.current });
      } else if (callState === "WEBRTC_ROOM") {
        socket.current.emit("endCall", { calleeId: otherUserIdRef.current });
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
    setCallState("JOIN");
    stopLocalMedia();
    InCallManager.stop();
    InCallManager.stopRingtone();
    otherUserIdRef.current = null;
    remoteRTCMessage.current = null;
    createNewPeerConnection();
  };

  // ---------- update user details & helpers ----------
  const updateUserDetails = (userDetails: UserModel) => {
    if (userDetails.userId) {
      setCallerId(userDetails.userId);
      setUserDetail(userDetails);
      setCallState("JOIN");
    }
  };

  const goToUpdateUser = () => {
    setCallState("UPDATE_USER");
  };

  const goToJoin = () => {
    setCallState("JOIN");
  };

  const setOtherUserId = (id: string | null) => {
    otherUserIdRef.current = id;
  };

  const toggleMic = () => {
    const enabled = !micEnabled;
    setMicEnabled(enabled);
    localStream?.getAudioTracks().forEach((t) => {
      t.enabled = enabled;
    });
    InCallManager.setMicrophoneMute(!enabled);
  };

  const toggleSpeaker = () => {
    const next = !speakerEnabled;
    InCallManager.setSpeakerphoneOn(next);
    setSpeakerEnabled(next);
  };

  const switchCamera = () => {
    localStream?.getVideoTracks().forEach((t: any) => {
      if (typeof t._switchCamera === "function") t._switchCamera();
    });
  };

  return {
    callerId,
    callState,
    localStream,
    remoteStream,
    localCallType,
    remoteCallType,
    micEnabled,
    cameraEnabled,
    speakerEnabled,
    callTime,
    userDetail,
    otherUserId: otherUserIdRef.current,

    setOtherUserId,
    updateUserDetails,
    startCall,
    acceptCall,
    leaveCall,
    toggleMic,
    toggleCamera,
    switchCamera,
    toggleSpeaker,
    goToUpdateUser,
    goToJoin,
  };
};
