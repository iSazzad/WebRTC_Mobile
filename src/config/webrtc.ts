export const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  // // TURN is required for many NATs; replace with your TURN server
  // {
  //   urls: [
  //     'turn:turn.example.com:3478?transport=udp',
  //     'turn:turn.example.com:3478?transport=tcp',
  //   ],
  //   username: 'TURN_USERNAME', // TODO: replace
  //   credential: 'TURN_CREDENTIAL', // TODO: replace
  // },
];

// const Prod_Vercel = "https://web-rtc-backend-tau.vercel.app";
const Prod_Render = "https://webrtc-backend-wqs8.onrender.com";
const Local = "http://192.168.1.164:3000";
export const SIGNAL_URL = Local; // TODO: move to env/config
