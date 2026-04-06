import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reminderRepo } from "@/services/repositories/reminderRepository";
import { scheduleReminder, cancelReminder } from "@/lib/native/notifications";
import { Capacitor } from "@capacitor/core";
import type { Reminder } from "@/lib/schema";

export function useReminders() {
  return useQuery({
    queryKey: ["reminders"],
    queryFn: reminderRepo.getAll,
  });
}

export function usePendingReminders() {
  return useQuery({
    queryKey: ["reminders", "pending"],
    queryFn: reminderRepo.getPending,
    refetchInterval: 60_000,
  });
}

export function useCreateReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Reminder, "id" | "createdAt" | "updatedAt">) =>
      reminderRepo.create(data),
    onSuccess: (reminder) => {
      // Schedule OS-level notification (native) or setTimeout (web)
      scheduleReminder(
        reminder.id,
        "FieldSales Reminder",
        reminder.title,
        new Date(reminder.dueAt)
      ).catch(() => {});
      qc.invalidateQueries({ queryKey: ["reminders"] });
    },
  });
}

export function useCompleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reminderRepo.complete(id),
    onSuccess: (_data, id) => {
      // Cancel any pending OS notification for this reminder
      if (Capacitor.isNativePlatform()) {
        cancelReminder(id).catch(() => {});
      }
      qc.invalidateQueries({ queryKey: ["reminders"] });
    },
  });
}

export function useDeleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => reminderRepo.delete(id),
    onSuccess: (_data, id) => {
      // Cancel any pending OS notification for this reminder
      if (Capacitor.isNativePlatform()) {
        cancelReminder(id).catch(() => {});
      }
      qc.invalidateQueries({ queryKey: ["reminders"] });
    },
  });
}
