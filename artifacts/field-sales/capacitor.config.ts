import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.dmllabs.fieldsales",
  appName: "FieldSales",
  webDir: "dist/public",
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    LocalNotifications: {
      smallIcon: "ic_stat_notification",
      iconColor: "#F40009",
      sound: "beep.wav",
    },
    StatusBar: {
      style: "Default",
      backgroundColor: "#ffffff",
    },
    Keyboard: {
      resize: "body" as const,
      style: "default" as const,
      resizeOnFullScreen: true,
    },
  },
};

export default config;
