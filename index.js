import { AppRegistry, PermissionsAndroid, Platform } from "react-native";
import App from "./App";
import { name as appName } from "./app.json";
import { registerGlobals } from "react-native-webrtc";
import RNCallKeep from "react-native-callkeep";

async function requestPermissions() {
  if (Platform.OS === "android") {
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      // You may also want READ_PHONE_STATE etc., depending on CallKeep docs
    ]);
  }
}

async function initCallKeep() {
  const options = {
    ios: { appName: "WebRTCApp" },
    android: {
      alertTitle: "Permissions required",
      alertDescription: "This application needs to access your phone accounts",
      cancelButton: "Cancel",
      okButton: "OK",
      additionalPermissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.INTERNET",
        "android.permission.READ_PHONE_STATE",
        "android.permission.CALL_PHONE",
      ],
      foregroundService: {
        channelId: "com.rctwebcallapp.background",
        channelName: "CallApp background service",
        notificationTitle: "CallApp is running",
        notificationIcon: "ic_launcher",
      },
    },
  };

  try {
    const accepted = await RNCallKeep.setup(options);
    console.log("RNCallKeep setup completed:", Platform.OS, accepted);
    await RNCallKeep.setAvailable(true);
  } catch (e) {
    console.error("RNCallKeep setup failed", e);
  }
}

(async () => {
  await requestPermissions();
  await initCallKeep();
  registerGlobals();
})();

AppRegistry.registerComponent(appName, () => App);
