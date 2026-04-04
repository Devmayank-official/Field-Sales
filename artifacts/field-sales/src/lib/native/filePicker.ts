import { Capacitor } from "@capacitor/core";
import { FilePicker } from "@capawesome/capacitor-file-picker";

export interface PickedFile {
  name: string;
  content: string;
}

export async function pickTextFile(mimeTypes: string[]): Promise<PickedFile | null> {
  if (!Capacitor.isNativePlatform()) {
    return null;
  }
  const result = await FilePicker.pickFiles({
    types: mimeTypes,
    readData: true,
    limit: 1,
  });
  const file = result.files[0];
  if (!file || !file.data) return null;
  const content = atob(file.data);
  return { name: file.name, content };
}
