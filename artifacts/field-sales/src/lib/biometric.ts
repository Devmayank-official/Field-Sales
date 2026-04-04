export async function isBiometricAvailable(): Promise<boolean> {
  try {
    if (!window.PublicKeyCredential) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function hashPin(pin: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(pin + "field-sales-salt"));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function setupBiometric(): Promise<string | null> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));
    const cred = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "FieldSales", id: window.location.hostname },
        user: { id: userId, name: "sales-rep", displayName: "Sales Rep" },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
        authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" },
        timeout: 60000,
      },
    }) as PublicKeyCredential | null;
    if (!cred) return null;
    return btoa(String.fromCharCode(...new Uint8Array(cred.rawId)));
  } catch {
    return null;
  }
}

export async function verifyBiometric(credentialId: string): Promise<boolean> {
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
