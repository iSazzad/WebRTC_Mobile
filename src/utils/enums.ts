export enum SignalType {
  OFFER = "offer",
  ANSWER = "answer",
  CANDIDATE = "candidate",
  LEAVE = "leave",
}

export enum MessageType {
  SIGNAL = "signal",
  CALL = "call",
}

export enum CallAction {
  START = "start",
  END = "end",
}

export enum CallStatus {
  ONGOING = "ongoing",
  ENDED = "ended",
}

export enum MediaType {
  AUDIO = "audio",
  VIDEO = "video",
  Default = "null",
}

export enum UserStatus {
  ONLINE = "online",
  OFFLINE = "offline",
}

export enum ConnectionState {
  NEW = "new",
  CONNECTING = "connecting",
  CONNECTED = "connected",
  DISCONNECTED = "disconnected",
  FAILED = "failed",
  CLOSED = "closed",
}

export enum ScreenState {
  UPDATE_USER = "UPDATE_USER",
  ALL_USERS = "ALL_USERS",
  JOIN = "JOIN",
  OUTGOING_CALL = "OUTGOING_CALL",
  INCOMING_CALL = "INCOMING_CALL",
  WEBRTC_ROOM = "WEBRTC_ROOM",
  SPECIFIC_USER = "SPECIFIC_USER",
}
