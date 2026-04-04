import { Capacitor } from "@capacitor/core";
import { Network } from "@capacitor/network";
import { useEffect, useState } from "react";

export function useNetworkStatus(): boolean {
  const [isOnline, setIsOnline] = useState<boolean>(true);

  useEffect(() => {
    let listenerHandle: { remove: () => void } | null = null;

    if (Capacitor.isNativePlatform()) {
      Network.getStatus().then((s) => setIsOnline(s.connected));
      Network.addListener("networkStatusChange", (status) => {
        setIsOnline(status.connected);
      }).then((handle) => {
        listenerHandle = handle;
      });
    } else {
      setIsOnline(navigator.onLine);
      const onOnline = () => setIsOnline(true);
      const onOffline = () => setIsOnline(false);
      window.addEventListener("online", onOnline);
      window.addEventListener("offline", onOffline);
      return () => {
        window.removeEventListener("online", onOnline);
        window.removeEventListener("offline", onOffline);
      };
    }

    return () => {
      listenerHandle?.remove();
    };
  }, []);

  return isOnline;
}
