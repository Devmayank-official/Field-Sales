import { useState, useEffect } from "react";
import { useReminders, useCreateReminder, useCompleteReminder, useDeleteReminder } from "@/hooks/useReminders";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Bell, Plus, Check, Trash2, Clock, AlertCircle, BellOff } from "lucide-react";
import { format, isPast, isToday, isTomorrow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { Reminder } from "@/lib/schema";
import { motion, useMotionValue, useTransform, animate } from "framer-motion";
import { haptic } from "@/lib/native/haptics";
import { requestNotificationPermission } from "@/lib/native/notifications";
import { Capacitor } from "@capacitor/core";

function dueDateLabel(ts: number): { text: string; className: string } {
  const date = new Date(ts);
  if (isPast(date) && !isToday(date))
    return { text: `Overdue · ${format(date, "MMM d")}`, className: "text-destructive font-semibold" };
  if (isToday(date))
    return { text: `Today · ${format(date, "h:mm a")}`, className: "text-amber-600 dark:text-amber-400 font-semibold" };
  if (isTomorrow(date))
    return { text: `Tomorrow · ${format(date, "h:mm a")}`, className: "text-blue-600 dark:text-blue-400" };
  return { text: format(date, "MMM d, yyyy · h:mm a"), className: "text-muted-foreground" };
}

const SWIPE_THRESHOLD = 75;

interface SwipeableReminderCardProps {
  r: Reminder;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}

function SwipeableReminderCard({ r, onComplete, onDelete }: SwipeableReminderCardProps) {
  const x = useMotionValue(0);
  const completeOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const deleteOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const completeScale = useTransform(x, [0, SWIPE_THRESHOLD], [0.7, 1]);
  const deleteScale = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0.7]);

  const { text, className } = dueDateLabel(r.dueAt);
  const isOverdue = isPast(new Date(r.dueAt)) && !isToday(new Date(r.dueAt)) && !r.isCompleted;

  const snapBack = () => animate(x, 0, { type: "spring", stiffness: 500, damping: 35 });
  const slideOff = (direction: "left" | "right") =>
    animate(x, direction === "right" ? 400 : -400, { duration: 0.2, ease: "easeOut" });

  const handleDragEnd = (_: never, info: { offset: { x: number }; velocity: { x: number } }) => {
    const { offset, velocity } = info;
    if (offset.x > SWIPE_THRESHOLD || velocity.x > 600) {
      haptic.medium();
      slideOff("right").then(() => onComplete(r.id));
    } else if (offset.x < -SWIPE_THRESHOLD || velocity.x < -600) {
      haptic.medium();
      snapBack();
      onDelete(r.id);
    } else {
      snapBack();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Complete hint — green, revealed on right swipe */}
      <motion.div
        className="absolute inset-0 flex items-center pl-5 bg-green-500 rounded-xl"
        style={{ opacity: completeOpacity }}
      >
        <motion.div style={{ scale: completeScale }} className="flex items-center gap-2">
          <Check className="w-5 h-5 text-white" />
          <span className="text-white font-semibold text-sm">Done</span>
        </motion.div>
      </motion.div>

      {/* Delete hint — red, revealed on left swipe */}
      <motion.div
        className="absolute inset-0 flex items-center justify-end pr-5 bg-destructive rounded-xl"
        style={{ opacity: deleteOpacity }}
      >
        <motion.div style={{ scale: deleteScale }} className="flex items-center gap-2">
          <span className="text-white font-semibold text-sm">Delete</span>
          <Trash2 className="w-5 h-5 text-white" />
        </motion.div>
      </motion.div>

      {/* Draggable card */}
      <motion.div
        style={{ x, position: "relative", zIndex: 1 }}
        drag="x"
        dragMomentum={false}
        dragElastic={0.12}
        onDragEnd={handleDragEnd}
        whileTap={{ cursor: "grabbing" }}
      >
        <Card
          className={cn(
            "border-border transition-colors touch-pan-y select-none",
            isOverdue && "border-destructive/30 bg-destructive/5"
          )}
        >
          <CardContent className="p-4 flex items-start gap-3">
            {isOverdue && (
              <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            )}
            {!isOverdue && (
              <Clock className={cn("w-4 h-4 mt-0.5 shrink-0", className)} />
            )}

            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm leading-snug">{r.title}</p>
              {r.clientName && (
                <p className="text-xs text-muted-foreground mt-0.5">{r.clientName}</p>
              )}
              <p className={cn("text-xs mt-1", className)}>{text}</p>
            </div>

            <div className="flex gap-1 shrink-0">
              <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8 text-green-600 hover:bg-green-500/10"
                onClick={(e) => { e.stopPropagation(); haptic.light(); onComplete(r.id); }}
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="w-8 h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={(e) => { e.stopPropagation(); haptic.light(); onDelete(r.id); }}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function RemindersPage() {
  const { toast } = useToast();
  const { data: reminders = [] } = useReminders();
  const createMutation = useCreateReminder();
  const completeMutation = useCompleteReminder();
  const deleteMutation = useDeleteReminder();

  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("09:00");
  const [notifGranted, setNotifGranted] = useState(false);
  const [activeTab, setActiveTab] = useState<"pending" | "done">("pending");

  useEffect(() => {
    requestNotificationPermission().then((granted) => setNotifGranted(granted));
  }, []);

  // Web-only: reschedule setTimeout-based reminders on each render so timers
  // survive page reloads. On native the OS manages notifications persistently.
  useEffect(() => {
    if (Capacitor.isNativePlatform()) return;
    if (!notifGranted || reminders.length === 0) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    reminders.forEach((r) => {
      if (r.isCompleted) return;
      const delay = r.dueAt - Date.now();
      if (delay > 0) {
        timers.push(
          setTimeout(async () => {
            if (!("Notification" in window) || Notification.permission !== "granted") return;
            try {
              const reg = await Promise.race([
                navigator.serviceWorker?.ready,
                new Promise<null>((res) => setTimeout(() => res(null), 3000)),
              ]);
              if (reg) {
                (reg as ServiceWorkerRegistration).showNotification("FieldSales Reminder", {
                  body: r.title,
                  icon: "/icons/icon-192.svg",
                });
              } else {
                new Notification("FieldSales Reminder", { body: r.title });
              }
            } catch {
              try { new Notification("FieldSales Reminder", { body: r.title }); } catch { /* ignore */ }
            }
          }, delay)
        );
      }
    });
    return () => timers.forEach(clearTimeout);
  }, [reminders, notifGranted]);

  const handleAdd = () => {
    if (!title.trim() || !dueDate) return;
    const dueAt = new Date(`${dueDate}T${dueTime}`).getTime();
    createMutation.mutate(
      { title: title.trim(), dueAt, isCompleted: false },
      {
        onSuccess: () => {
          toast({ title: "Reminder set" });
          setAddOpen(false);
          setTitle("");
          setDueDate("");
          setDueTime("09:00");
        },
      }
    );
  };

  const pending = reminders.filter((r) => !r.isCompleted).sort((a, b) => a.dueAt - b.dueAt);
  const done = reminders.filter((r) => r.isCompleted).sort((a, b) => b.updatedAt - a.updatedAt);
  const displayed = activeTab === "pending" ? pending : done;

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="p-5 space-y-5 min-h-full bg-background">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl -mx-5 px-5 pt-3 pb-3 -mt-5 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reminders</h1>
        <Button size="sm" className="rounded-xl gap-1.5" onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </header>

      {!notifGranted && (
        <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-400">
          <BellOff className="w-4 h-4 shrink-0" />
          <span>Enable notifications to receive reminder alerts.</span>
          <Button
            size="sm"
            variant="outline"
            className="ml-auto shrink-0 h-7 text-xs"
            onClick={() =>
              Notification.requestPermission().then((p) => setNotifGranted(p === "granted"))
            }
          >
            Enable
          </Button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {(["pending", "done"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
              activeTab === tab
                ? "bg-foreground text-background shadow"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            )}
          >
            {tab === "pending" ? `Upcoming (${pending.length})` : `Done (${done.length})`}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-base font-medium">
            {activeTab === "pending" ? "No upcoming reminders" : "Nothing completed yet"}
          </p>
          {activeTab === "pending" && (
            <p className="text-sm mt-1">Tap Add to create a reminder.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map((r: Reminder) => {
            if (!r.isCompleted) {
              return (
                <SwipeableReminderCard
                  key={r.id}
                  r={r}
                  onComplete={(id) => completeMutation.mutate(id)}
                  onDelete={(id) => setDeleteTarget(id)}
                />
              );
            }
            const { text, className } = dueDateLabel(r.dueAt);
            return (
              <Card key={r.id} className="border-border opacity-50">
                <CardContent className="p-4 flex items-start gap-3">
                  <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-snug line-through">{r.title}</p>
                    {r.clientName && (
                      <p className="text-xs text-muted-foreground mt-0.5">{r.clientName}</p>
                    )}
                    <p className={cn("text-xs mt-1", className)}>{text}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="w-8 h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => { haptic.light(); setDeleteTarget(r.id); }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-[92vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle>New Reminder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Follow up with Sunrise Supermarket"
                autoFocus
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  min={today}
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Time</Label>
                <Input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              onClick={handleAdd}
              disabled={!title.trim() || !dueDate || createMutation.isPending}
            >
              {createMutation.isPending ? "Saving..." : "Set Reminder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}
        title="Delete Reminder?"
        description="This reminder will be permanently removed."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
          setDeleteTarget(null);
        }}
      />
    </div>
  );
}
