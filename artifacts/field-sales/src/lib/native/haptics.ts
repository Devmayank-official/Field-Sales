import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

const isNative = Capacitor.isNativePlatform();

function webVibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // silently ignore — desktop browsers don't support vibrate
  }
}

export const haptic = {
  light: () => {
    if (isNative) {
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {});
    } else {
      webVibrate(20);
    }
  },

  medium: () => {
    if (isNative) {
      Haptics.impact({ style: ImpactStyle.Medium }).catch(() => {});
    } else {
      webVibrate(50);
    }
  },

  heavy: () => {
    if (isNative) {
      Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
    } else {
      webVibrate(80);
    }
  },

  success: () => {
    if (isNative) {
      Haptics.notification({ type: NotificationType.Success }).catch(() => {});
    } else {
      webVibrate([30, 20, 80]);
    }
  },

  error: () => {
    if (isNative) {
      Haptics.notification({ type: NotificationType.Error }).catch(() => {});
    } else {
      webVibrate([80, 40, 80, 40, 80]);
    }
  },

  warning: () => {
    if (isNative) {
      Haptics.notification({ type: NotificationType.Warning }).catch(() => {});
    } else {
      webVibrate([50, 30, 50]);
    }
  },

  selection: () => {
    if (isNative) {
      Haptics.selectionStart()
        .then(() => Haptics.selectionChanged())
        .then(() => Haptics.selectionEnd())
        .catch(() => {});
    } else {
      webVibrate(10);
    }
  },
};
