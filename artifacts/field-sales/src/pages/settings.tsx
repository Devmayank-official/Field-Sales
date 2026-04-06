import { useRef, useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Download, Upload, RefreshCw, Trash2, Database, UserCircle, Moon,
  Edit2, Check, X, FileJson, FileSpreadsheet, Lock, LockOpen, Fingerprint, ShieldCheck,
  Bug, ChevronDown, ChevronUp, Copy, Cpu, Bell, BellOff, Timer,
} from "lucide-react";
import { copyToClipboard } from "@/lib/native/clipboard";
import { requestNotificationPermission, scheduleReminder } from "@/lib/native/notifications";
import { zustandPrefsStorage } from "@/lib/native/preferences";
import { hashPin, setupBiometric, isBiometricAvailable } from "@/lib/native/biometric";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { db, seedDatabase } from "@/services/db/dexieDb";
import { useUiStore } from "@/store/uiStore";
import type { Client, Fridge, Visit } from "@/lib/schema";
import { Capacitor } from "@capacitor/core";
import { saveAndShare } from "@/lib/native/filesystem";
import { pickTextFile } from "@/lib/native/filePicker";

interface ExportData {
  clients: Client[];
  fridges: Fridge[];
  visits: Visit[];
  exportDate: string;
  version: string;
}

function clientsToCsv(clients: Client[]): string {
  const headers = ["id","name","phone","email","address","subAddress","pincode","shopType","status","tags","notes","visitFrequency","monthlyValueEstimate","lastVisitAt","createdAt","updatedAt"];
  const rows = clients.map(c => headers.map(h => {
    const val = (c as any)[h];
    if (h === "tags") return `"${(val as string[]).join("|")}"`;
    if (val === undefined || val === null) return "";
    return `"${String(val).replace(/"/g, '""')}"`;
  }).join(","));
  return [headers.join(","), ...rows].join("\n");
}

function fridgesToCsv(fridges: Fridge[]): string {
  const headers = ["id","clientId","serialNo","gccCode","qrCodeValue","condition","notes","installationDate","lastCheckedAt","createdAt","updatedAt"];
  const rows = fridges.map(f => headers.map(h => {
    const val = (f as any)[h];
    if (val === undefined || val === null) return "";
    return `"${String(val).replace(/"/g, '""')}"`;
  }).join(","));
  return [headers.join(","), ...rows].join("\n");
}

function visitsToCsv(visits: Visit[]): string {
  const headers = ["id","clientId","startedAt","endedAt","locationLat","locationLng","locationNote","notes","followUpOutcome","status","fridgesChecked","createdAt","updatedAt"];
  const rows = visits.map(v => headers.map(h => {
    const val = (v as any)[h];
    if (h === "fridgesChecked") return `"${(val as string[]).join("|")}"`;
    if (val === undefined || val === null) return "";
    return `"${String(val).replace(/"/g, '""')}"`;
  }).join(","));
  return [headers.join(","), ...rows].join("\n");
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).filter(l => l.trim()).map(line => {
    const values: string[] = [];
    let cur = "";
    let inQuotes = false;
    let i = 0;
    while (i < line.length) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"'; i += 2; continue; // escaped double-quote ""
        }
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        values.push(cur); cur = "";
      } else {
        cur += ch;
      }
      i++;
    }
    values.push(cur);
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ""; });
    return row;
  });
}

function toNum(v: string): number | undefined {
  if (v === "" || v === undefined) return undefined;
  const n = Number(v);
  return isNaN(n) ? undefined : n;
}

function toBool(v: string): boolean {
  return v === "true" || v === "1";
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function Settings() {
  const { toast } = useToast();
  const {
    isDarkMode, toggleDarkMode, profile, setProfile,
    lockEnabled, pinLength, enableLock, disableLock, setBiometricCredId, biometricCredId,
    lockTimeoutMinutes, setLockTimeout,
  } = useUiStore();

  const importJsonRef = useRef<HTMLInputElement>(null);
  const importCsvClientsRef = useRef<HTMLInputElement>(null);
  const importCsvAssetsRef = useRef<HTMLInputElement>(null);
  const importCsvVisitsRef = useRef<HTMLInputElement>(null);

  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [seedConfirmOpen, setSeedConfirmOpen] = useState(false);
  const [importConfirmData, setImportConfirmData] = useState<ExportData | null>(null);
  const [profileEditOpen, setProfileEditOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState(profile);

  const [csvFiles, setCsvFiles] = useState<{ clients?: File; assets?: File; visits?: File }>({});
  const [csvImportConfirmOpen, setCsvImportConfirmOpen] = useState(false);

  const [debugOpen, setDebugOpen] = useState(false);
  const [nukeConfirmOpen, setNukeConfirmOpen] = useState(false);
  const [clearStoreConfirmOpen, setClearStoreConfirmOpen] = useState(false);
  const [dbStats, setDbStats] = useState<{
    clients: number; fridges: number; visits: number; images: number; reminders: number;
  } | null>(null);
  const [notifGranted, setNotifGranted] = useState(false);

  const [lockSetupOpen, setLockSetupOpen] = useState(false);
  const [disableLockConfirm, setDisableLockConfirm] = useState(false);
  const [pinStep, setPinStep] = useState<"enter" | "confirm">("enter");
  const [pin1, setPin1] = useState("");
  const [pin2, setPin2] = useState("");
  const [pinError, setPinError] = useState("");
  const [bioAvailable, setBioAvailable] = useState(false);

  const isProduction = import.meta.env.PROD;

  useState(() => {
    isBiometricAvailable().then(setBioAvailable);
  });

  const loadStats = useCallback(async () => {
    if (isProduction) return;
    const [c, f, v, img, r] = await Promise.all([
      db.clients.count(), db.fridges.count(), db.visits.count(),
      db.images.count(), db.reminders.count(),
    ]);
    setDbStats({ clients: c, fridges: f, visits: v, images: img, reminders: r });
  }, [isProduction]);

  useEffect(() => { loadStats(); }, [loadStats]);

  useEffect(() => {
    requestNotificationPermission().then(setNotifGranted);
  }, []);

  const copyDebugInfo = async () => {
    const info = {
      buildMode: import.meta.env.MODE,
      baseUrl: import.meta.env.BASE_URL,
      platform: Capacitor.getPlatform(),
      isNative: Capacitor.isNativePlatform(),
      dbStats,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    };
    await copyToClipboard(JSON.stringify(info, null, 2));
    toast({ title: "Debug info copied" });
  };

  const nukeIndexedDb = () => {
    indexedDB.deleteDatabase("FieldSalesDB");
    toast({ title: "Database nuked — reloading..." });
    setTimeout(() => window.location.reload(), 1200);
  };

  const clearUiStore = async () => {
    await zustandPrefsStorage.removeItem("field-sales-ui");
    toast({ title: "Settings store cleared — reloading..." });
    setTimeout(() => window.location.reload(), 1200);
  };

  const rescheduleAllReminders = async () => {
    const granted = await requestNotificationPermission();
    if (!granted) { toast({ title: "Notifications not permitted", variant: "destructive" }); return; }
    const pending = await db.reminders.filter((r) => !r.isCompleted).toArray();
    let scheduled = 0;
    for (const r of pending) {
      if (r.dueAt > Date.now()) {
        await scheduleReminder(r.id, "FieldSales Reminder", r.title, new Date(r.dueAt)).catch(() => {});
        scheduled++;
      }
    }
    toast({ title: `Scheduled ${scheduled} reminder notification${scheduled !== 1 ? "s" : ""}` });
    setNotifGranted(true);
  };

  const testToasts = () => {
    toast({ title: "Default toast", description: "Everything looks good" });
    setTimeout(() => toast({ title: "Success!", description: "Action completed", className: "border-green-500" }), 600);
    setTimeout(() => toast({ title: "Warning", description: "Something needs attention", variant: "default" }), 1200);
    setTimeout(() => toast({ title: "Error", description: "Something went wrong", variant: "destructive" }), 1800);
  };

  const openLockSetup = () => {
    setPinStep("enter");
    setPin1("");
    setPin2("");
    setPinError("");
    setLockSetupOpen(true);
  };

  const handlePinSetup = async () => {
    if (pinStep === "enter") {
      if (pin1.length < 4) { setPinError("PIN must be at least 4 digits"); return; }
      setPinStep("confirm");
      setPinError("");
      return;
    }
    if (pin1 !== pin2) {
      setPinError("PINs do not match. Try again.");
      setPinStep("enter");
      setPin1("");
      setPin2("");
      return;
    }
    const hash = await hashPin(pin1);
    enableLock(hash, pin1.length);
    setLockSetupOpen(false);
    toast({ title: "App lock enabled" });
  };

  const handleSetupBiometric = async () => {
    const credId = await setupBiometric();
    if (credId) {
      setBiometricCredId(credId);
      toast({ title: "Biometric authentication enabled" });
    } else {
      toast({ title: "Biometric setup failed", variant: "destructive" });
    }
  };

  const handleExportJson = async () => {
    setExportDialogOpen(false);
    try {
      const clients = await db.clients.toArray();
      const fridges = await db.fridges.toArray();
      const visits = await db.visits.toArray();
      const data: ExportData = { clients, fridges, visits, exportDate: new Date().toISOString(), version: "1.0" };
      await saveAndShare(JSON.stringify(data, null, 2), `field_sales_backup_${Date.now()}.json`, "application/json");
      toast({ title: "JSON backup exported" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const handleExportCsv = async () => {
    setExportDialogOpen(false);
    try {
      const clients = await db.clients.toArray();
      const fridges = await db.fridges.toArray();
      const visits = await db.visits.toArray();
      if (Capacitor.isNativePlatform()) {
        await saveAndShare(clientsToCsv(clients), `clients_${Date.now()}.csv`, "text/csv");
        await saveAndShare(fridgesToCsv(fridges), `assets_${Date.now()}.csv`, "text/csv");
        await saveAndShare(visitsToCsv(visits), `visits_${Date.now()}.csv`, "text/csv");
      } else {
        downloadBlob(clientsToCsv(clients), `clients_${Date.now()}.csv`, "text/csv");
        setTimeout(() => downloadBlob(fridgesToCsv(fridges), `assets_${Date.now()}.csv`, "text/csv"), 300);
        setTimeout(() => downloadBlob(visitsToCsv(visits), `visits_${Date.now()}.csv`, "text/csv"), 600);
      }
      toast({ title: "CSV files exported (3 files)" });
    } catch {
      toast({ title: "CSV export failed", variant: "destructive" });
    }
  };

  const handleNativeJsonImport = async () => {
    setImportDialogOpen(false);
    try {
      const picked = await pickTextFile(["application/json"]);
      if (!picked) return;
      const data: ExportData = JSON.parse(picked.content);
      if (!data.clients || !data.fridges || !data.visits) throw new Error("Invalid backup format");
      setImportConfirmData(data);
    } catch (err) {
      toast({ title: "Import failed", description: err instanceof Error ? err.message : "Invalid file", variant: "destructive" });
    }
  };

  const handleNativeCsvPick = async (field: "clients" | "assets" | "visits") => {
    try {
      const picked = await pickTextFile(["text/csv", "text/comma-separated-values"]);
      if (!picked) return;
      const blob = new Blob([picked.content], { type: "text/csv" });
      const file = new File([blob], picked.name, { type: "text/csv" });
      setCsvFiles((prev) => ({ ...prev, [field]: file }));
    } catch {
      toast({ title: "Could not pick file", variant: "destructive" });
    }
  };

  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportDialogOpen(false);
    try {
      const text = await file.text();
      const data: ExportData = JSON.parse(text);
      if (!data.clients || !data.fridges || !data.visits) throw new Error("Invalid backup format");
      setImportConfirmData(data);
    } catch (err) {
      toast({ title: "Import failed", description: err instanceof Error ? err.message : "Invalid file", variant: "destructive" });
    } finally {
      if (importJsonRef.current) importJsonRef.current.value = "";
    }
  };

  const doImportJson = async () => {
    if (!importConfirmData) return;
    try {
      await db.transaction("rw", db.clients, db.fridges, db.visits, async () => {
        await db.clients.bulkPut(importConfirmData.clients);
        await db.fridges.bulkPut(importConfirmData.fridges);
        await db.visits.bulkPut(importConfirmData.visits);
      });
      toast({ title: `Imported ${importConfirmData.clients.length} clients successfully` });
      setImportConfirmData(null);
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      toast({ title: "Import failed", variant: "destructive" });
      setImportConfirmData(null);
    }
  };

  const handleCsvFileChange = (field: "clients" | "assets" | "visits") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) setCsvFiles(prev => ({ ...prev, [field]: file }));
    };

  const triggerCsvImport = () => {
    if (!csvFiles.clients && !csvFiles.assets && !csvFiles.visits) {
      toast({ title: "Select at least one CSV file to import", variant: "destructive" });
      return;
    }
    setCsvImportConfirmOpen(true);
  };

  const doImportCsv = async () => {
    setCsvImportConfirmOpen(false);
    setImportDialogOpen(false);
    try {
      await db.transaction("rw", db.clients, db.fridges, db.visits, async () => {
        if (csvFiles.clients) {
          const rows = parseCsv(await csvFiles.clients.text());
          const records = rows.map(r => ({
            ...r,
            tags: r.tags ? r.tags.split("|").filter(Boolean) : [],
            isArchived: toBool(r.isArchived),
            visitFrequency: toNum(r.visitFrequency),
            monthlyValueEstimate: toNum(r.monthlyValueEstimate),
            lastVisitAt: toNum(r.lastVisitAt),
            createdAt: toNum(r.createdAt) ?? Date.now(),
            updatedAt: toNum(r.updatedAt) ?? Date.now(),
          }));
          await db.clients.bulkPut(records as unknown as Client[]);
        }
        if (csvFiles.assets) {
          const rows = parseCsv(await csvFiles.assets.text());
          const records = rows.map(r => ({
            ...r,
            installationDate: toNum(r.installationDate),
            lastCheckedAt: toNum(r.lastCheckedAt),
            createdAt: toNum(r.createdAt) ?? Date.now(),
            updatedAt: toNum(r.updatedAt) ?? Date.now(),
          }));
          await db.fridges.bulkPut(records as unknown as Fridge[]);
        }
        if (csvFiles.visits) {
          const rows = parseCsv(await csvFiles.visits.text());
          const records = rows.map(r => ({
            ...r,
            fridgesChecked: r.fridgesChecked ? r.fridgesChecked.split("|").filter(Boolean) : [],
            startedAt: toNum(r.startedAt) ?? Date.now(),
            endedAt: toNum(r.endedAt),
            locationLat: toNum(r.locationLat),
            locationLng: toNum(r.locationLng),
            createdAt: toNum(r.createdAt) ?? Date.now(),
            updatedAt: toNum(r.updatedAt) ?? Date.now(),
          }));
          await db.visits.bulkPut(records as unknown as Visit[]);
        }
      });
      const counts = [
        csvFiles.clients && "clients",
        csvFiles.assets && "assets",
        csvFiles.visits && "visits",
      ].filter(Boolean).join(", ");
      toast({ title: `CSV imported: ${counts}` });
      setCsvFiles({});
      setTimeout(() => window.location.reload(), 1200);
    } catch {
      toast({ title: "CSV import failed", variant: "destructive" });
    }
  };

  const handleSeed = async () => {
    const count = await db.clients.count();
    if (count > 0) {
      await db.clients.clear();
      await db.fridges.clear();
      await db.visits.clear();
    }
    await seedDatabase();
    toast({ title: "Sample data loaded" });
    setTimeout(() => window.location.reload(), 1000);
  };

  const handleClearData = async () => {
    try {
      await db.clients.clear();
      await db.fridges.clear();
      await db.visits.clear();
      await db.images.clear();
      toast({ title: "All data cleared" });
      setTimeout(() => window.location.reload(), 1000);
    } catch {
      toast({ title: "Failed to clear data", variant: "destructive" });
    }
  };

  const handleSaveProfile = () => {
    setProfile(profileDraft);
    setProfileEditOpen(false);
    toast({ title: "Profile updated" });
  };

  return (
    <div className="p-5 space-y-7 min-h-full bg-background">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl -mx-5 px-5 pt-3 pb-3 -mt-5">
        <h1 className="text-2xl font-bold">Settings</h1>
      </header>

      {/* Profile */}
      <Card className="bg-card border-border">
        <CardContent className="p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <UserCircle className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold truncate">{profile.name}</h3>
            <p className="text-sm text-muted-foreground truncate">{profile.role}</p>
            {profile.territory && (
              <p className="text-xs text-muted-foreground truncate">{profile.territory}</p>
            )}
            <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Offline Ready
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => { setProfileDraft(profile); setProfileEditOpen(true); }}
            className="shrink-0"
          >
            <Edit2 className="w-4 h-4 text-muted-foreground" />
          </Button>
        </CardContent>
      </Card>

      {/* Appearance */}
      <div className="space-y-3">
        <h3 className="font-bold flex items-center gap-2">
          <Moon className="w-4 h-4" /> Appearance
        </h3>
        <Card className="border-border bg-card">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">Dark Mode</p>
                <p className="text-xs text-muted-foreground">Switch to dark theme</p>
              </div>
              <Switch checked={isDarkMode} onCheckedChange={toggleDarkMode} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Security */}
      <div className="space-y-3">
        <h3 className="font-bold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> Security
        </h3>
        <Card className="border-border bg-card">
          <CardContent className="p-0 divide-y divide-border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${lockEnabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {lockEnabled ? <Lock className="w-5 h-5" /> : <LockOpen className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-medium">App Lock (PIN)</p>
                  <p className="text-xs text-muted-foreground">{lockEnabled ? "Lock enabled — app locks when minimized" : "Protect your data with a PIN code"}</p>
                </div>
              </div>
              <Switch
                checked={lockEnabled}
                onCheckedChange={(v) => v ? openLockSetup() : setDisableLockConfirm(true)}
              />
            </div>

            {lockEnabled && bioAvailable && (
              <button
                onClick={handleSetupBiometric}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
              >
                <div className={`p-2 rounded-lg ${biometricCredId ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                  <Fingerprint className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Face ID / Fingerprint</p>
                  <p className="text-xs text-muted-foreground">{biometricCredId ? "Biometric unlock active — tap to update" : "Set up biometric unlock"}</p>
                </div>
                {biometricCredId && <Check className="w-4 h-4 text-green-500 ml-auto" />}
              </button>
            )}

            {lockEnabled && (
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                    <Timer className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">Auto-Lock Timer</p>
                    <p className="text-xs text-muted-foreground">Lock after this long idle</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  {([0, 5, 15, 30] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setLockTimeout(m)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                        lockTimeoutMinutes === m
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/70"
                      }`}
                    >
                      {m === 0 ? "Off" : `${m}m`}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Notifications */}
      <div className="space-y-3">
        <h3 className="font-bold flex items-center gap-2">
          <Bell className="w-4 h-4" /> Notifications
        </h3>
        <Card className="border-border bg-card">
          <CardContent className="p-0 divide-y divide-border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${notifGranted ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                  {notifGranted ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                </div>
                <div>
                  <p className="font-medium">Push Notifications</p>
                  <p className="text-xs text-muted-foreground">
                    {notifGranted ? "Notifications enabled — reminders will alert you" : "Allow notifications for reminder alerts"}
                  </p>
                </div>
              </div>
              {notifGranted
                ? <Check className="w-4 h-4 text-green-500 shrink-0" />
                : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 h-8 text-xs"
                    onClick={() => requestNotificationPermission().then(setNotifGranted)}
                  >
                    Enable
                  </Button>
                )}
            </div>

            {notifGranted && (
              <button
                onClick={rescheduleAllReminders}
                className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                  <RefreshCw className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium">Reschedule All Reminders</p>
                  <p className="text-xs text-muted-foreground">Re-register all pending reminders with the OS</p>
                </div>
              </button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data management */}
      <div className="space-y-3">
        <h3 className="font-bold flex items-center gap-2">
          <Database className="w-4 h-4" /> Local Data
        </h3>

        <Card className="border-border bg-card">
          <CardContent className="p-0 divide-y divide-border">
            {/* Export */}
            <button
              onClick={() => setExportDialogOpen(true)}
              className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">Export Data</p>
                <p className="text-xs text-muted-foreground">Save as JSON backup or CSV files</p>
              </div>
            </button>

            {/* Import */}
            <button
              onClick={() => setImportDialogOpen(true)}
              className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
            >
              <div className="p-2 rounded-lg bg-green-500/10 text-green-600">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium">Import Data</p>
                <p className="text-xs text-muted-foreground">Restore from JSON backup or CSV files</p>
              </div>
            </button>

            {/* Wipe Data */}
            <button
              onClick={() => setClearConfirmOpen(true)}
              className="w-full flex items-center gap-3 p-4 hover:bg-destructive/10 transition-colors text-left group"
            >
              <div className="p-2 rounded-lg bg-destructive/10 text-destructive group-hover:bg-destructive group-hover:text-white transition-colors">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <p className="font-medium text-destructive">Wipe All Data</p>
                <p className="text-xs text-muted-foreground">Delete every record permanently</p>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>

      {/* ── DEBUG PANEL — DEV only ──────────────────────── */}
      {!isProduction && (
        <div className="space-y-3">
          <button
            onClick={() => setDebugOpen(p => !p)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="font-bold flex items-center gap-2 text-amber-500">
              <Bug className="w-4 h-4" /> Developer Tools
            </h3>
            {debugOpen
              ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
              : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {debugOpen && (
            <Card className="border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-0 divide-y divide-border">

                {/* DB Stats */}
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Database className="w-3.5 h-3.5" /> IndexedDB Record Counts
                    </p>
                    <button
                      onClick={loadStats}
                      className="p-1 rounded-md hover:bg-muted/60 transition-colors text-muted-foreground hover:text-foreground"
                      title="Refresh counts"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {dbStats ? (
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: "Clients", val: dbStats.clients },
                        { label: "Fridges", val: dbStats.fridges },
                        { label: "Visits", val: dbStats.visits },
                        { label: "Images", val: dbStats.images },
                        { label: "Reminders", val: dbStats.reminders },
                      ].map(({ label, val }) => (
                        <div key={label} className="bg-card rounded-lg p-2.5 text-center border border-border">
                          <p className="text-lg font-bold">{val}</p>
                          <p className="text-[10px] text-muted-foreground">{label}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">Loading…</p>
                  )}
                </div>

                {/* Platform Info */}
                <div className="p-4 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5" /> Build & Platform
                  </p>
                  {[
                    { label: "Version", val: `v${__APP_VERSION__} (${__GIT_SHA__})` },
                    { label: "Build Mode", val: import.meta.env.MODE },
                    { label: "Base URL", val: import.meta.env.BASE_URL || "/" },
                    { label: "Platform", val: Capacitor.getPlatform() },
                    { label: "Native", val: Capacitor.isNativePlatform() ? "Yes" : "No (Web)" },
                    { label: "Notifications", val: notifGranted ? "Granted" : "Not granted" },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-mono bg-muted px-2 py-0.5 rounded text-foreground">{val}</span>
                    </div>
                  ))}
                </div>

                {/* uiStore inspector */}
                <div className="p-4 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" /> uiStore (Persisted State)
                  </p>
                  {[
                    { label: "Name", val: profile.name || "—" },
                    { label: "Role", val: profile.role || "—" },
                    { label: "Territory", val: profile.territory || "—" },
                    { label: "Dark Mode", val: isDarkMode ? "On" : "Off" },
                    { label: "App Lock", val: lockEnabled ? `ON (${pinLength}-digit PIN)` : "Off" },
                    { label: "Auto-Lock", val: lockTimeoutMinutes === 0 ? "Off" : `${lockTimeoutMinutes} min` },
                    { label: "Biometric", val: biometricCredId ? "Configured" : "None" },
                  ].map(({ label, val }) => (
                    <div key={label} className="flex justify-between items-center text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-mono bg-muted px-2 py-0.5 rounded text-foreground max-w-[55%] truncate text-right">{val}</span>
                    </div>
                  ))}
                </div>

                {/* Load Sample Data */}
                <button
                  onClick={() => setSeedConfirmOpen(true)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="p-2 rounded-lg bg-primary/10 text-primary">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Load Sample Data</p>
                    <p className="text-xs text-muted-foreground">Clear & reseed DB with demo clients, fridges & visits</p>
                  </div>
                </button>

                {/* Actions */}
                <button
                  onClick={copyDebugInfo}
                  className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                    <Copy className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Copy Debug Info</p>
                    <p className="text-xs text-muted-foreground">JSON snapshot of build, platform & DB stats</p>
                  </div>
                </button>

                <button
                  onClick={testToasts}
                  className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                    <Bell className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Test Toast Notifications</p>
                    <p className="text-xs text-muted-foreground">Fire all 4 toast variants in sequence</p>
                  </div>
                </button>

                <button
                  onClick={() => window.location.reload()}
                  className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="p-2 rounded-lg bg-muted text-muted-foreground">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Force Page Reload</p>
                    <p className="text-xs text-muted-foreground">Hard refresh without clearing data</p>
                  </div>
                </button>

                <button
                  onClick={() => setClearStoreConfirmOpen(true)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-orange-500/10 transition-colors text-left group"
                >
                  <div className="p-2 rounded-lg bg-orange-500/10 text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                    <Cpu className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-orange-600">Clear Settings Store</p>
                    <p className="text-xs text-muted-foreground">Wipe persisted profile, PIN & preferences (IndexedDB untouched)</p>
                  </div>
                </button>

                <button
                  onClick={() => setNukeConfirmOpen(true)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-destructive/10 transition-colors text-left group"
                >
                  <div className="p-2 rounded-lg bg-destructive/10 text-destructive group-hover:bg-destructive group-hover:text-white transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm text-destructive">Nuke IndexedDB</p>
                    <p className="text-xs text-muted-foreground">Deletes the entire database file. Harder reset than Wipe.</p>
                  </div>
                </button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── ABOUT ─────────────────────────────────────── */}
      <div className="space-y-3 pb-2">
        <h3 className="font-bold flex items-center gap-2">
          <ShieldCheck className="w-4 h-4" /> About
        </h3>
        <Card className="border-border bg-card overflow-hidden">
          <CardContent className="p-0">
            {/* App identity */}
            <div className="flex items-center gap-4 p-4 border-b border-border">
              <img
                src="/logo-icon.jpg"
                alt="FieldSales"
                className="w-12 h-12 rounded-2xl object-cover shrink-0 shadow-lg"
              />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base">FieldSales</p>
                <p className="text-xs text-muted-foreground">Field Sales &amp; Asset Intelligence</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] font-mono bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                    v{__APP_VERSION__} ({__GIT_SHA__})
                  </span>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                    Offline Ready
                  </span>
                </div>
              </div>
            </div>

            {/* Developer */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">Developed by</p>
                <p className="font-semibold text-sm">DML Labs</p>
              </div>
              <button
                onClick={() => void copyToClipboard("https://github.com/Devmayank-official")}
                className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted hover:bg-muted/70 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Copy className="w-3 h-3" />
                @Devmayank-official
              </button>
            </div>

            {/* App ID */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold mb-0.5">App ID</p>
                <p className="font-mono text-xs text-foreground">com.dmllabs.fieldsales</p>
              </div>
              <button
                onClick={() => void copyToClipboard("com.dmllabs.fieldsales")}
                className="text-muted-foreground hover:text-foreground transition-colors p-2"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Platform row */}
            <div className="grid grid-cols-3 divide-x divide-border">
              {[
                { label: "Platform", val: Capacitor.getPlatform() },
                { label: "Build", val: import.meta.env.MODE },
                { label: "Native", val: Capacitor.isNativePlatform() ? "Yes" : "Web" },
              ].map(({ label, val }) => (
                <div key={label} className="flex flex-col items-center py-3 gap-0.5">
                  <span className="text-sm font-semibold capitalize">{val}</span>
                  <span className="text-[10px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground/50 tracking-widest uppercase pb-2">
          © {new Date().getFullYear()} DML Labs · All rights reserved
        </p>
      </div>

      {/* Hidden file inputs */}
      <input ref={importJsonRef} type="file" accept=".json" className="hidden" onChange={handleImportJson} />
      <input ref={importCsvClientsRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFileChange("clients")} />
      <input ref={importCsvAssetsRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFileChange("assets")} />
      <input ref={importCsvVisitsRef} type="file" accept=".csv" className="hidden" onChange={handleCsvFileChange("visits")} />

      {/* ── EXPORT DIALOG ─────────────────────────────── */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-[92vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Export Data</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1">Choose the format you want to save your data in.</p>

          <div className="grid grid-cols-2 gap-3 py-2">
            <button
              onClick={handleExportJson}
              className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-center"
            >
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500">
                <FileJson className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-sm">JSON Backup</p>
                <p className="text-xs text-muted-foreground mt-0.5">Single file, full restore</p>
              </div>
            </button>

            <button
              onClick={handleExportCsv}
              className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-center"
            >
              <div className="p-3 rounded-xl bg-teal-500/10 text-teal-600">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-sm">CSV Files</p>
                <p className="text-xs text-muted-foreground mt-0.5">3 files — Excel compatible</p>
              </div>
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── IMPORT DIALOG ─────────────────────────────── */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-[92vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Import Data</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground -mt-1">Restore from a previous export file.</p>

          <div className="space-y-3 py-2">
            {/* JSON option */}
            <button
              onClick={() => Capacitor.isNativePlatform() ? void handleNativeJsonImport() : importJsonRef.current?.click()}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary hover:bg-primary/5 transition-all text-left"
            >
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                <FileJson className="w-5 h-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">JSON Backup</p>
                <p className="text-xs text-muted-foreground">Select a .json backup file — merges all records</p>
              </div>
            </button>

            {/* CSV option */}
            <div className="rounded-xl border-2 border-border p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-600 shrink-0">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-semibold text-sm">CSV Files</p>
                  <p className="text-xs text-muted-foreground">Select one or more CSV files to import</p>
                </div>
              </div>

              <div className="space-y-2 pl-1">
                {/* Clients CSV */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => Capacitor.isNativePlatform() ? void handleNativeCsvPick("clients") : importCsvClientsRef.current?.click()}
                    className="flex-1 text-left px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary hover:bg-muted/40 transition-colors text-xs text-muted-foreground"
                  >
                    {csvFiles.clients ? (
                      <span className="text-foreground font-medium">{csvFiles.clients.name}</span>
                    ) : (
                      "Clients CSV"
                    )}
                  </button>
                  {csvFiles.clients && (
                    <button onClick={() => setCsvFiles(p => ({ ...p, clients: undefined }))} className="text-muted-foreground hover:text-destructive">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Assets CSV */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => Capacitor.isNativePlatform() ? void handleNativeCsvPick("assets") : importCsvAssetsRef.current?.click()}
                    className="flex-1 text-left px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary hover:bg-muted/40 transition-colors text-xs text-muted-foreground"
                  >
                    {csvFiles.assets ? (
                      <span className="text-foreground font-medium">{csvFiles.assets.name}</span>
                    ) : (
                      "Assets / Fridges CSV"
                    )}
                  </button>
                  {csvFiles.assets && (
                    <button onClick={() => setCsvFiles(p => ({ ...p, assets: undefined }))} className="text-muted-foreground hover:text-destructive">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Visits CSV */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => Capacitor.isNativePlatform() ? void handleNativeCsvPick("visits") : importCsvVisitsRef.current?.click()}
                    className="flex-1 text-left px-3 py-2 rounded-lg border border-dashed border-border hover:border-primary hover:bg-muted/40 transition-colors text-xs text-muted-foreground"
                  >
                    {csvFiles.visits ? (
                      <span className="text-foreground font-medium">{csvFiles.visits.name}</span>
                    ) : (
                      "Visits CSV"
                    )}
                  </button>
                  {csvFiles.visits && (
                    <button onClick={() => setCsvFiles(p => ({ ...p, visits: undefined }))} className="text-muted-foreground hover:text-destructive">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <Button
                size="sm"
                className="w-full mt-1"
                disabled={!csvFiles.clients && !csvFiles.assets && !csvFiles.visits}
                onClick={triggerCsvImport}
              >
                Import Selected CSV Files
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── CONFIRM DIALOGS ───────────────────────────── */}
      <ConfirmDialog
        open={clearConfirmOpen}
        onOpenChange={setClearConfirmOpen}
        title="Wipe All Data?"
        description="This will permanently delete ALL local data — clients, assets, visits, and photos. This cannot be undone."
        confirmLabel="Wipe All Data"
        variant="destructive"
        onConfirm={handleClearData}
        countdownSeconds={5}
      />

      <ConfirmDialog
        open={seedConfirmOpen}
        onOpenChange={setSeedConfirmOpen}
        title="Load Sample Data?"
        description="This will clear all existing records and replace them with demo data. Continue?"
        confirmLabel="Load Sample Data"
        onConfirm={handleSeed}
      />

      {importConfirmData && (
        <ConfirmDialog
          open={!!importConfirmData}
          onOpenChange={(o) => { if (!o) setImportConfirmData(null); }}
          title={`Import ${importConfirmData.clients.length} clients?`}
          description={`This will merge ${importConfirmData.clients.length} clients, ${importConfirmData.fridges.length} assets, and ${importConfirmData.visits.length} visits with existing data. Duplicate IDs will be overwritten.`}
          confirmLabel="Import"
          onConfirm={doImportJson}
        />
      )}

      <ConfirmDialog
        open={csvImportConfirmOpen}
        onOpenChange={setCsvImportConfirmOpen}
        title="Import CSV files?"
        description="Records from the selected CSV files will be merged into your local database. Duplicate IDs will be overwritten."
        confirmLabel="Import"
        onConfirm={doImportCsv}
      />

      {/* ── NUKE INDEXEDDB CONFIRM ────────────────────── */}
      <ConfirmDialog
        open={nukeConfirmOpen}
        onOpenChange={setNukeConfirmOpen}
        title="Nuke Entire Database?"
        description="This deletes the IndexedDB database file itself — harder to recover than a normal wipe. The app will reload fresh. Dev use only."
        confirmLabel="Nuke It"
        variant="destructive"
        onConfirm={nukeIndexedDb}
        countdownSeconds={3}
      />

      {/* ── CLEAR UISTORE CONFIRM ─────────────────────── */}
      <ConfirmDialog
        open={clearStoreConfirmOpen}
        onOpenChange={setClearStoreConfirmOpen}
        title="Clear Settings Store?"
        description="This resets your profile, PIN, dark mode, and all persisted preferences back to defaults. Your client/fridge/visit data in the database is NOT affected."
        confirmLabel="Clear Settings"
        variant="destructive"
        onConfirm={clearUiStore}
        countdownSeconds={3}
      />

      {/* ── DISABLE LOCK CONFIRM ─────────────────────── */}
      <ConfirmDialog
        open={disableLockConfirm}
        onOpenChange={setDisableLockConfirm}
        title="Disable App Lock?"
        description="Your PIN and biometric setup will be removed. Anyone with access to your device can open the app."
        confirmLabel="Disable Lock"
        variant="destructive"
        onConfirm={() => { disableLock(); setDisableLockConfirm(false); toast({ title: "App lock disabled" }); }}
      />

      {/* ── PIN SETUP DIALOG ──────────────────────────── */}
      <Dialog open={lockSetupOpen} onOpenChange={setLockSetupOpen}>
        <DialogContent className="max-w-[92vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle>{pinStep === "enter" ? "Set a PIN Code" : "Confirm Your PIN"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              {pinStep === "enter"
                ? "Choose a 4–8 digit PIN to protect your app."
                : "Enter your PIN again to confirm."}
            </p>
            <Input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              placeholder="Enter PIN"
              value={pinStep === "enter" ? pin1 : pin2}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "");
                pinStep === "enter" ? setPin1(val) : setPin2(val);
                setPinError("");
              }}
              autoFocus
            />
            {pinError && <p className="text-sm text-destructive">{pinError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setLockSetupOpen(false); setPinStep("enter"); setPin1(""); setPin2(""); }}>
              Cancel
            </Button>
            <Button onClick={handlePinSetup}>
              {pinStep === "enter" ? "Next" : "Enable Lock"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── PROFILE EDIT MODAL ────────────────────────── */}
      <Dialog open={profileEditOpen} onOpenChange={setProfileEditOpen}>
        <DialogContent className="max-w-[92vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="prof-name">Full Name</Label>
              <Input
                id="prof-name"
                value={profileDraft.name}
                onChange={(e) => setProfileDraft((p) => ({ ...p, name: e.target.value }))}
                placeholder="Your name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-role">Role / Title</Label>
              <Input
                id="prof-role"
                value={profileDraft.role}
                onChange={(e) => setProfileDraft((p) => ({ ...p, role: e.target.value }))}
                placeholder="e.g. Field Sales Agent"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-phone">Phone</Label>
              <Input
                id="prof-phone"
                type="tel"
                value={profileDraft.phone}
                onChange={(e) => setProfileDraft((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+1 555-0000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-email">Email</Label>
              <Input
                id="prof-email"
                type="email"
                value={profileDraft.email}
                onChange={(e) => setProfileDraft((p) => ({ ...p, email: e.target.value }))}
                placeholder="you@company.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prof-territory">Territory / Region</Label>
              <Input
                id="prof-territory"
                value={profileDraft.territory}
                onChange={(e) => setProfileDraft((p) => ({ ...p, territory: e.target.value }))}
                placeholder="e.g. West District"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setProfileEditOpen(false)}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button onClick={handleSaveProfile}>
              <Check className="w-4 h-4 mr-1" /> Save Profile
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
