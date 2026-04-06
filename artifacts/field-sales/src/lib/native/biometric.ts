import { Capacitor } from "@capacitor/core";

export async function isBiometricAvailable(): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { NativeBiometric } = await import("capacitor-native-biometric");
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch {
      return false;
    }
  }
  // Web: WebAuthn platform authenticator
  try {
    if (!window.PublicKeyCredential) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function hashPin(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(pin + "field-sales-salt")
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function setupBiometric(): Promise<string | null> {
  if (Capacitor.isNativePlatform()) {
    // On native, biometric is device-managed — no credential ID needed.
    // Return a sentinel so callers know biometric is enabled.
    return "native";
  }

  // Web: WebAuthn credential registration
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));
    const cred = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "FieldSales", id: window.location.hostname },
        user: {
          id: userId,
          name: "sales-rep",
          displayName: "Sales Rep",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },
          { alg: -257, type: "public-key" },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;
    if (!cred) return null;
    return btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
  } catch {
    return null;
  }
}

export async function verifyBiometric(credentialId: string): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { NativeBiometric } = await import("capacitor-native-biometric");
      await NativeBiometric.verifyIdentity({
        reason: "Unlock FieldSales",
        title: "Unlock FieldSales",
        subtitle: "Use your fingerprint or face to continue",
        maxAttempts: 3,
      });
      return true;
    } catch {
      return false;
    }
  }

  // Web: WebAuthn credential assertion
  if (credentialId === "native") return false;
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const rawId = Uint8Array.from(atob(credentialId), (c) => c.charCodeAt(0));
    const result = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [{ id: rawId, type: "public-key", transports: ["internal"] }],
        userVerification: "required",
        timeout: 60000,
      },
    });
    return !!result;
  } catch {
    return false;
  }
}
