import Sound from "react-native-sound";
let ringSound: Sound | null = null;

export const startRingSound = () => {
  if (!ringSound) {
    ringSound = new Sound("dialerTone.mp3", Sound.MAIN_BUNDLE, (error) => {
      if (error) {
        console.log("Error loading sound", error);
        return;
      }
      ringSound?.setNumberOfLoops(-1); // loop
      ringSound?.play();
    });
  }
};

export const stopRingSound = () => {
  if (ringSound) {
    ringSound.stop(() => {
      ringSound?.release();
      ringSound = null;
    });
  }
};
