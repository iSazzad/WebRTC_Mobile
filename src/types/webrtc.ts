export type CallState =
  | "JOIN"
  | "OUTGOING_CALL"
  | "INCOMING_CALL"
  | "WEBRTC_ROOM";

export interface StreamProps {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  localMicOn: boolean;
  localWebcamOn: boolean;
}
