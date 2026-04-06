import { Capacitor } from "@capacitor/core";

const isNative = Capacitor.isNativePlatform();

const PIN_KEY = "fieldsales_pin_hash";
const BIO_KEY = "fieldsales_bio_cred";

async function getPlugin() {
  if (!isNative) return null;
  try {
    const { SecureStoragePlugin } = await import("capacitor-secure-storage-plugin");
    return SecureStoragePlugin;
  } catch {
    return null;
  }
}

export const secureStorage = {
  async setPin(hash: string): Promise<void> {
    const plugin = await getPlugin();
    if (plugin) {
      await plugin.set({ key: PIN_KEY, value: hash });
    } else {
      localStorage.setItem(PIN_KEY, hash);
    }
  },

  async getPin(): Promise<string | null> {
    const plugin = await getPlugin();
    if (plugin) {
      try {
        const { value } = await plugin.get({ key: PIN_KEY });
        return value ?? null;
      } catch {
        return null;
      }
    }
    return localStorage.getItem(PIN_KEY);
  },

  async clearPin(): Promise<void> {
    const plugin = await getPlugin();
    if (plugin) {
      try {
        await plugin.remove({ key: PIN_KEY });
      } catch {
        // key may not exist yet
      }
    } else {
      localStorage.removeItem(PIN_KEY);
    }
  },

  async setBioCred(credId: string): Promise<void> {
    const plugin = await getPlugin();
    if (plugin) {
      await plugin.set({ key: BIO_KEY, value: credId });
    } else {
      localStorage.setItem(BIO_KEY, credId);
    }
  },

  async getBioCred(): Promise<string | null> {
    const plugin = await getPlugin();
    if (plugin) {
      try {
        const { value } = await plugin.get({ key: BIO_KEY });
        return value ?? null;
      } catch {
        return null;
      }
    }
    return localStorage.getItem(BIO_KEY);
  },

  async clearBioCred(): Promise<void> {
    const plugin = await getPlugin();
    if (plugin) {
      try {
        await plugin.remove({ key: BIO_KEY });
      } catch {}
    } else {
      localStorage.removeItem(BIO_KEY);
    }
  },
};
