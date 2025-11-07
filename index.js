/**
 * @format
 */

import {AppRegistry} from 'react-native';
import App from './App';
import {name as appName} from './app.json';
import {registerGlobals} from 'react-native-webrtc';
import {PermissionsAndroid, Platform} from 'react-native';

async function requestPermissions() {
  if (Platform.OS === 'android') {
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.CAMERA,
      PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    ]);
  }
}
requestPermissions();
registerGlobals();

AppRegistry.registerComponent(appName, () => App);
