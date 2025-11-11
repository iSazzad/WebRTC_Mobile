declare module "react-native-webrtc" {
  interface RTCPeerConnection {
    onnegotiationneeded: ((this: RTCPeerConnection, ev: Event) => any) | null;
    onicecandidate:
      | ((this: RTCPeerConnection, ev: RTCPeerConnectionIceEvent) => any)
      | null;
    onicecandidateerror: ((this: RTCPeerConnection, ev: Event) => any) | null;
    onsignalingstatechange:
      | ((this: RTCPeerConnection, ev: Event) => any)
      | null;
    oniceconnectionstatechange:
      | ((this: RTCPeerConnection, ev: Event) => any)
      | null;
    onicegatheringstatechange:
      | ((this: RTCPeerConnection, ev: Event) => any)
      | null;
    onconnectionstatechange:
      | ((this: RTCPeerConnection, ev: Event) => any)
      | null;
    ontrack: ((this: RTCPeerConnection, ev: RTCTrackEvent) => any) | null;
    ondatachannel:
      | ((this: RTCPeerConnection, ev: RTCDataChannelEvent) => any)
      | null;
  }
}
// declare module "react-native-webrtc" {
//   interface RTCDataChannel {
//     open: ((this: RTCDataChannel, ev: Event) => any) | null;
//     bufferedamountlow: ((this: RTCDataChannel, ev: Event) => any) | null;
//     closing: ((this: RTCDataChannel, ev: Event) => any) | null;
//     close: ((this: RTCDataChannel, ev: Event) => any) | null;
//     message: ((this: RTCDataChannel, ev: MessageEvent) => any) | null;
//   }
// }
// declare module "react-native-webrtc" {
//   interface MediaStreamTrack {
//     onended: ((this: MediaStreamTrack, ev: Event) => any) | null;
//     onmute: ((this: MediaStreamTrack, ev: Event) => any) | null;
//     onunmute: ((this: MediaStreamTrack, ev: Event) => any) | null;
//   }
// }
// declare module "react-native-webrtc" {
//   interface MediaStream {
//     onaddtrack: ((this: MediaStream, ev: MediaStreamTrackEvent) => any) | null;
//     onremovetrack:
//       | ((this: MediaStream, ev: MediaStreamTrackEvent) => any)
//       | null;
//   }
// }

// declare module "react-native-webrtc" {
//   interface RTCSessionDescription {
//     toJSON(): any;
//   }
// }
// declare module "react-native-webrtc" {
//   interface RTCIceCandidate {
//     toJSON(): any;
//   }
// }
// declare module "react-native-webrtc" {
//   function getUserMedia(
//     constraints: MediaStreamConstraints
//   ): Promise<MediaStream>;
// }
// declare module "react-native-webrtc" {
//   function mediaDevicesenumerateDevices(): Promise<MediaDeviceInfo[]>;
// }
// declare module "react-native-webrtc" {
//   function mediaDevicesgetUserMedia(
//     constraints: MediaStreamConstraints
//   ): Promise<MediaStream>;
// }
// declare module "react-native-webrtc" {
//   function mediaDevicesgetDisplayMedia(
//     constraints: MediaStreamConstraints
//   ): Promise<MediaStream>;
// }
// declare module "react-native-webrtc" {
//   const mediaDevices: {
//     enumerateDevices: typeof mediaDevicesenumerateDevices;
//     getUserMedia: typeof mediaDevicesgetUserMedia;
//     getDisplayMedia: typeof mediaDevicesgetDisplayMedia;
//   };
// }
// declare module "react-native-webrtc" {
//   interface Navigator {
//     mediaDevices: typeof mediaDevices;
//   }
// }
// declare module "react-native-webrtc" {
//   const navigator: Navigator;
// }
// declare module "react-native-webrtc" {
//   function RTCIceCandidateInitFromCandidate(
//     candidate: RTCIceCandidate
//   ): RTCIceCandidateInit;
// }
// declare module "react-native-webrtc" {
//   function RTCSessionDescriptionInitFromDescription(
//     description: RTCSessionDescription
//   ): RTCSessionDescriptionInit;
// }
// declare module "react-native-webrtc" {
//   interface RTCTrackEvent {
//     receiver: RTCRtpReceiver;
//     transceiver: RTCRtpTransceiver;
//   }
// }
// declare module "react-native-webrtc" {
//   interface RTCPeerConnectionIceEvent {
//     candidate: RTCIceCandidate | null;
//   }
// }
// declare module "react-native-webrtc" {
//   interface RTCDataChannelEvent {
//     channel: RTCDataChannel;
//   }
// }
// declare module "react-native-webrtc" {
//   interface MediaStreamTrackEvent {
//     track: MediaStreamTrack;
//   }
// }
// declare module "react-native-webrtc" {
//   export {
//     getUserMedia,
//     mediaDevices,
//     navigator,
//     RTCIceCandidate,
//     RTCSessionDescription,
//     RTCPeerConnection,
//     RTCIceCandidateInitFromCandidate,
//     RTCSessionDescriptionInitFromDescription,
//   };
// }
