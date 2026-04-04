import { Link, useLocation } from "wouter";
import { LayoutDashboard, Users, Settings, Search, Plus, X, UserCircle, Store, MapPin, Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useActiveVisits } from "@/hooks/useVisits";
import { usePendingReminders } from "@/hooks/useReminders";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useUiStore } from "@/store/uiStore";
import { setAppBadge } from "@/lib/native/badge";
import { NetworkBanner } from "@/components/layout/NetworkBanner";
import { LockScreen } from "@/components/layout/LockScreen";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ClientForm } from "@/components/forms/ClientForm";

const MAIN_ROUTES = ["/", "/clients", "/search", "/settings", "/reminders"];

interface FabAction {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  color?: string;
}

function FabMenu({ location }: { location: string }) {
  const [open, setOpen] = useState(false);
  const { setCreateClientOpen } = useUiStore();
  const [, navigate] = useLocation();

  const fabActions: FabAction[] = [];

  if (location === "/" || location === "/clients") {
    fabActions.push({
      icon: Store,
      label: "New Client",
      onClick: () => { setOpen(false); setCreateClientOpen(true); },
      color: "bg-blue-500 text-white",
    });
  }

  if (location === "/") {
    fabActions.push({
      icon: MapPin,
      label: "My Clients",
      onClick: () => { setOpen(false); navigate("/clients"); },
      color: "bg-emerald-500 text-white",
    });
  }

  if (fabActions.length === 0) return null;

  return (
    <div className="fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3">
      <AnimatePresence>
        {open && (
          <>
            {fabActions.map((action, i) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, scale: 0.6, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.6, y: 10 }}
                transition={{ delay: i * 0.05, type: "spring", stiffness: 400, damping: 25 }}
                className="flex items-center gap-3"
              >
                <span className="bg-card border border-border shadow-lg rounded-full px-3 py-1.5 text-sm font-medium whitespace-nowrap">
                  {action.label}
                </span>
                <button
                  onClick={action.onClick}
                  className={cn(
                    "w-12 h-12 rounded-full shadow-lg flex items-center justify-center shrink-0 active:scale-90 transition-transform",
                    action.color ?? "bg-primary text-primary-foreground"
                  )}
                >
                  <action.icon className="w-5 h-5" />
                </button>
              </motion.div>
            ))}
          </>
        )}
      </AnimatePresence>

      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "w-14 h-14 rounded-full shadow-xl shadow-primary/30 flex items-center justify-center transition-colors",
          open ? "bg-foreground text-background" : "bg-primary text-primary-foreground"
        )}
      >
        <motion.div
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          {open ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </motion.div>
      </motion.button>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: activeVisits } = useActiveVisits();
  const { data: pendingReminders } = usePendingReminders();
  const { lockEnabled, isLocked, isCreateClientOpen, setCreateClientOpen, lockTimeoutMinutes, setLocked } = useUiStore();

  useEffect(() => {
    if (!lockEnabled || lockTimeoutMinutes === 0 || isLocked) return;
    const ms = lockTimeoutMinutes * 60 * 1000;
    let timer = window.setTimeout(() => setLocked(true), ms);
    const reset = () => { clearTimeout(timer); timer = window.setTimeout(() => setLocked(true), ms); };
    const events = ["mousemove", "keydown", "touchstart", "click", "scroll"] as const;
    events.forEach(e => window.addEventListener(e, reset, { passive: true }));
    return () => { clearTimeout(timer); events.forEach(e => window.removeEventListener(e, reset)); };
  }, [lockEnabled, isLocked, lockTimeoutMinutes, setLocked]);

  const hasActiveVisit = activeVisits && activeVisits.length > 0;
  const activeVisitId = hasActiveVisit ? activeVisits[0].id : null;
  const overdueCount = pendingReminders?.filter((r) => r.dueAt <= Date.now()).length ?? 0;

  useEffect(() => {
    setAppBadge(overdueCount);
  }, [overdueCount]);

  const navItems = [
    { href: "/", icon: LayoutDashboard, label: "Home" },
    { href: "/clients", icon: Users, label: "Clients" },
    { href: "/search", icon: Search, label: "Search" },
    { href: "/settings", icon: Settings, label: "Settings" },
  ];

  const isVisitScreen = location.startsWith("/visit/");
  const isMainTab = MAIN_ROUTES.includes(location);
  const showFab = isMainTab && !isVisitScreen;

  return (
    <div className="flex flex-col h-[100dvh] bg-background text-foreground overflow-hidden">
      {/* Lock screen overlay */}
      {lockEnabled && isLocked && <LockScreen />}

      {/* Top App Bar */}
      {!isVisitScreen && (
        <header className="shrink-0 bg-card/80 backdrop-blur-xl border-b border-border z-40">
          <div className="flex items-center justify-between px-4 h-14 max-w-3xl mx-auto">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center shrink-0">
                <Store className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-base tracking-tight">FieldSales</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Reminders bell */}
              <Link
                href="/reminders"
                className="relative w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center hover:bg-muted transition-colors"
              >
                <Bell className="w-4 h-4 text-muted-foreground" />
                {overdueCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground rounded-full text-[9px] font-bold flex items-center justify-center">
                    {overdueCount > 9 ? "9+" : overdueCount}
                  </span>
                )}
              </Link>
              {/* Profile */}
              <Link
                href="/settings"
                className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center hover:bg-primary/20 transition-colors"
              >
                <UserCircle className="w-5 h-5 text-primary" />
              </Link>
            </div>
          </div>
        </header>
      )}

      {/* Active Visit Banner */}
      <AnimatePresence>
        {hasActiveVisit && !isVisitScreen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-primary text-primary-foreground px-4 py-2.5 flex items-center justify-between shadow-md z-40 shrink-0"
          >
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
              </span>
              <span className="font-medium text-sm">Visit in progress</span>
            </div>
            <Link
              href={`/visit/${activeVisitId}`}
              className="bg-white/20 hover:bg-white/30 transition-colors px-3 py-1 rounded-full text-sm font-semibold"
            >
              Resume
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline Banner */}
      <NetworkBanner />

      {/* Main Content */}
      <main
        className="flex-1 overflow-y-auto relative no-scrollbar"
        style={{
          paddingBottom: isVisitScreen
            ? "0"
            : "calc(4rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div className="max-w-3xl mx-auto min-h-full">{children}</div>
      </main>

      {/* FAB Speed Dial */}
      {showFab && <FabMenu location={location} />}

      {/* Global New Client Sheet — mounted app-wide so FAB works from any screen */}
      <Sheet open={isCreateClientOpen} onOpenChange={setCreateClientOpen}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl px-6 py-6 overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl">New Client</SheetTitle>
            <SheetDescription>Add a new prospect or active client.</SheetDescription>
          </SheetHeader>
          <ClientForm onSuccess={() => setCreateClientOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Bottom Navigation */}
      {!isVisitScreen && (
        <nav className="fixed bottom-0 left-0 right-0 bg-card/90 backdrop-blur-xl border-t border-border z-50">
          <div
            className="flex justify-around items-center max-w-3xl mx-auto px-2"
            style={{ height: "calc(4rem + env(safe-area-inset-bottom, 0px))", paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
          >
            {navItems.map((item) => {
              const isActive =
                location === item.href ||
                (item.href !== "/" && item.href !== "/search" && location.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center flex-1 h-full space-y-1 transition-colors duration-200",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon
                    className={cn("w-5 h-5", isActive && "fill-primary/20")}
                    strokeWidth={isActive ? 2.5 : 2}
                  />
                  <span className="text-[10px] font-medium">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}
