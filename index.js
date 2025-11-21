/**
 * @format
 */

import { AppRegistry } from "react-native";
import App from "./App";
import { name as appName } from "./app.json";
import { registerGlobals } from "react-native-webrtc";
import { PermissionsAndroid, Platform } from "react-native";
import RNCallKeep from "react-native-callkeep";

async function requestPermissions() {
  if (Platform.OS === "android") {
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);
  }
}
requestPermissions();
registerGlobals();

const options = {
  ios: {
    appName: "CallApp",
  },
  android: {
    alertTitle: "Permissions",
    alertDescription: "Allow access to phone services",
    cancelButton: "Cancel",
    okButton: "OK",
  },
};

RNCallKeep.setup(options);
AppRegistry.registerComponent(appName, () => App);
