import AsyncStorage from "@react-native-async-storage/async-storage";

export async function setAsyncStorageValue(token: string | null, key: string) {
  try {
    if (token) await AsyncStorage.setItem(key, token);
    else await AsyncStorage.removeItem(key);
  } catch (e) {
    console.warn("setAuthToken error", e);
  }
}

export async function getAsyncStorageValue(
  key: string
): Promise<string | null> {
  try {
    const t = await AsyncStorage.getItem(key);
    return t;
  } catch (e) {
    console.warn("getAuthToken error", e);
    return null;
  }
}

export async function clearAsyncStorageValue(key: string) {
  try {
    await AsyncStorage.removeItem(key);
  } catch (e) {
    console.warn("clearAuthToken error", e);
  }
}

export default {
  setAsyncStorageValue,
  getAsyncStorageValue,
  clearAsyncStorageValue,
};
