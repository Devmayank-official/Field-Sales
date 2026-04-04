import { db } from "../db/dexieDb";
import type { Reminder } from "@/lib/schema";
import { v4 as uuidv4 } from "uuid";

export const reminderRepo = {
  getAll: async () => db.reminders.orderBy("dueAt").toArray(),

  getPending: async () =>
    db.reminders.where("isCompleted").equals(0).sortBy("dueAt"),

  getOverdue: async () => {
    const now = Date.now();
    return db.reminders
      .where("isCompleted").equals(0)
      .and((r) => r.dueAt <= now)
      .sortBy("dueAt");
  },

  create: async (data: Omit<Reminder, "id" | "createdAt" | "updatedAt">): Promise<Reminder> => {
    const reminder: Reminder = {
      ...data,
      id: uuidv4(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await db.reminders.add(reminder);
    return reminder;
  },

  update: async (id: string, data: Partial<Reminder>) => {
    await db.reminders.update(id, { ...data, updatedAt: Date.now() });
    return db.reminders.get(id);
  },

  complete: async (id: string) => {
    await db.reminders.update(id, { isCompleted: true, updatedAt: Date.now() });
  },

  delete: async (id: string) => db.reminders.delete(id),
};
