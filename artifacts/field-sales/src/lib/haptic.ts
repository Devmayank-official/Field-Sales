function vibrate(pattern: number | number[]) {
  try {
    if ("vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    // silently ignore — vibration is a best-effort feature
  }
}

export const haptic = {
  light: () => vibrate(20),
  medium: () => vibrate(50),
  error: () => vibrate([80, 40, 80]),
  success: () => vibrate([30, 20, 80]),
};
