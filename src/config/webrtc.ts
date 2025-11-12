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

export const SIGNAL_URL = "http://192.168.0.116:3000"; // TODO: move to env/config
