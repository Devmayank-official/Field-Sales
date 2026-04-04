import { z } from "zod";

export const ClientStatusEnum = z.enum(["Lead", "Contacted", "Active", "High Value", "Inactive"]);
export type ClientStatus = z.infer<typeof ClientStatusEnum>;

export const FridgeConditionEnum = z.enum(["Good", "Needs Repair", "Critical", "Dead"]);
export type FridgeCondition = z.infer<typeof FridgeConditionEnum>;

export const VisitStatusEnum = z.enum(["active", "completed"]);
export type VisitStatus = z.infer<typeof VisitStatusEnum>;

export const COLOR_LABELS = ["red", "orange", "amber", "green", "blue", "purple"] as const;
export type ColorLabel = (typeof COLOR_LABELS)[number];

export const COLOR_LABEL_STYLES: Record<ColorLabel, { dot: string; border: string; bg: string; text: string }> = {
  red:    { dot: "bg-red-500",    border: "border-l-red-500",    bg: "bg-red-500/8",    text: "text-red-600 dark:text-red-400" },
  orange: { dot: "bg-orange-500", border: "border-l-orange-500", bg: "bg-orange-500/8", text: "text-orange-600 dark:text-orange-400" },
  amber:  { dot: "bg-amber-500",  border: "border-l-amber-500",  bg: "bg-amber-500/8",  text: "text-amber-600 dark:text-amber-400" },
  green:  { dot: "bg-green-500",  border: "border-l-green-500",  bg: "bg-green-500/8",  text: "text-green-600 dark:text-green-400" },
  blue:   { dot: "bg-blue-500",   border: "border-l-blue-500",   bg: "bg-blue-500/8",   text: "text-blue-600 dark:text-blue-400" },
  purple: { dot: "bg-purple-500", border: "border-l-purple-500", bg: "bg-purple-500/8", text: "text-purple-600 dark:text-purple-400" },
};

export interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address: string;
  subAddress?: string;
  pincode?: string;
  shopType: string;
  status: ClientStatus;
  tags: string[];
  colorLabel?: ColorLabel;
  isArchived?: boolean;
  notes?: string;
  visitFrequency?: number;
  monthlyValueEstimate?: number;
  createdAt: number;
  updatedAt: number;
  lastVisitAt?: number;
}

export interface Fridge {
  id: string;
  clientId: string;
  serialNo: string;
  gccCode?: string;
  qrCodeValue?: string;
  condition: FridgeCondition;
  installationDate?: number;
  lastCheckedAt?: number;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface Visit {
  id: string;
  clientId: string;
  startedAt: number;
  endedAt?: number;
  locationLat?: number;
  locationLng?: number;
  locationNote?: string;
  notes?: string;
  followUpOutcome?: string;
  status: VisitStatus;
  fridgesChecked: string[];
  createdAt: number;
  updatedAt: number;
}

export interface AppImage {
  id: string;
  entityType: "client" | "fridge" | "visit";
  entityId: string;
  fileRef: string;
  thumbnailRef?: string;
  caption?: string;
  createdAt: number;
}

export interface Reminder {
  id: string;
  title: string;
  clientId?: string;
  clientName?: string;
  dueAt: number;
  isCompleted: boolean;
  createdAt: number;
  updatedAt: number;
}

export const insertClientSchema = z.object({
  name: z.string().min(2, "Name is required"),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  address: z.string().min(2, "Address is required"),
  subAddress: z.string().optional(),
  pincode: z.string().optional(),
  shopType: z.string().min(1, "Shop type is required"),
  status: ClientStatusEnum.default("Lead"),
  colorLabel: z.enum(COLOR_LABELS).optional(),
  tags: z.string().transform((str) =>
    str.split(",").map((s) => s.trim()).filter(Boolean)
  ),
  notes: z.string().optional(),
  visitFrequency: z.coerce.number().optional(),
  monthlyValueEstimate: z.coerce.number().optional(),
});

export type InsertClient = z.infer<typeof insertClientSchema>;

export const insertFridgeSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  serialNo: z.string().min(1, "Serial Number is required"),
  gccCode: z.string().optional(),
  qrCodeValue: z.string().optional(),
  condition: FridgeConditionEnum.default("Good"),
  notes: z.string().optional(),
});

export type InsertFridge = z.infer<typeof insertFridgeSchema>;
