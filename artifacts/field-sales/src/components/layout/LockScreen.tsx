import { useState, useCallback } from "react";
import { useUiStore } from "@/store/uiStore";
import { hashPin, verifyBiometric, isBiometricAvailable } from "@/lib/native/biometric";
import { Button } from "@/components/ui/button";
import { Fingerprint, Store, Delete } from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/native/haptics";

export function LockScreen() {
  const { pinHash, pinLength, biometricCredId, setLocked } = useUiStore();
  const [digits, setDigits] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);

  useEffect(() => {
    isBiometricAvailable().then(setBioAvailable);
  }, []);

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const verify = useCallback(async (pin: string) => {
    const hash = await hashPin(pin);
    if (hash === pinHash) {
      haptic.success();
      setError("");
      setLocked(false);
    } else {
      haptic.error();
      setError("Incorrect PIN");
      setDigits([]);
      triggerShake();
    }
  }, [pinHash, setLocked]);

  const handleDigit = useCallback((d: string) => {
    haptic.light();
    setError("");
    setDigits((prev) => {
      const next = [...prev, d];
      if (next.length === pinLength) {
        verify(next.join(""));
        return [];
      }
      return next;
    });
  }, [verify, pinLength]);

  const handleBiometric = async () => {
    if (!biometricCredId) return;
    const ok = await verifyBiometric(biometricCredId);
    if (ok) {
      haptic.success();
      setLocked(false);
    } else {
      haptic.error();
      setError("Biometric failed — enter PIN");
    }
  };

  const KEYS = ["1","2","3","4","5","6","7","8","9","","0","⌫"];

  return (
    <div className="fixed inset-0 z-[9999] bg-background flex flex-col items-center justify-center gap-8 px-8">
      <div className="flex flex-col items-center gap-3">
        <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-lg">
          <Store className="w-7 h-7 text-primary-foreground" />
        </div>
        <h1 className="text-xl font-bold">FieldSales</h1>
        <p className="text-sm text-muted-foreground">Enter your PIN to continue</p>
      </div>

      {/* PIN dots */}
      <div className={cn("flex gap-4", shake && "animate-[wiggle_0.4s_ease-in-out]")}>
        {Array.from({ length: pinLength }, (_, i) => i).map((i) => (
          <div
            key={i}
            className={cn(
              "w-4 h-4 rounded-full border-2 transition-all",
              i < digits.length
                ? "bg-primary border-primary scale-110"
                : "border-muted-foreground/40"
            )}
          />
        ))}
      </div>

      {error && (
        <p className="text-sm text-destructive -mt-4 font-medium">{error}</p>
      )}

      {/* Numpad */}
      <div className="grid grid-cols-3 gap-4 w-full max-w-[240px]">
        {KEYS.map((key, i) => {
          if (key === "") return <div key={i} />;
          if (key === "⌫") {
            return (
              <button
                key={i}
                onClick={() => { haptic.light(); setDigits((p) => p.slice(0, -1)); }}
                className="h-16 rounded-2xl flex items-center justify-center text-muted-foreground hover:bg-muted transition-colors active:scale-95"
              >
                <Delete className="w-5 h-5" />
              </button>
            );
          }
          return (
            <button
              key={i}
              onClick={() => handleDigit(key)}
              className="h-16 rounded-2xl bg-card border border-border shadow-sm text-xl font-semibold hover:bg-muted transition-colors active:scale-95"
            >
              {key}
            </button>
          );
        })}
      </div>

      {bioAvailable && biometricCredId && (
        <Button
          variant="outline"
          className="rounded-xl gap-2"
          onClick={handleBiometric}
        >
          <Fingerprint className="w-5 h-5 text-primary" />
          Use Face ID / Fingerprint
        </Button>
      )}
    </div>
  );
}
