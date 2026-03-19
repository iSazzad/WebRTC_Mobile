import { ENV, LOCAL_URL, PRODUCTION_URL } from "@env";

export const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
];

export const SIGNAL_URL = ENV === "prod" ? PRODUCTION_URL : LOCAL_URL;
