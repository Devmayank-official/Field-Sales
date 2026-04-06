import { motion, AnimatePresence } from "framer-motion";
import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/lib/native/network";

export function NetworkBanner() {
  const isOnline = useNetworkStatus();
  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 text-sm font-medium shrink-0 z-40 overflow-hidden"
        >
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>You're offline — changes save locally</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
