import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect } from "react";
import { useState } from "react";
import { seedDatabase } from "@/services/db/dexieDb";
import { useUiStore } from "@/store/uiStore";
import { Capacitor } from "@capacitor/core";

import { AppShell } from "@/components/layout/AppShell";
import Dashboard from "@/pages/dashboard";
import ClientsList from "@/pages/clients";
import ClientDetail from "@/pages/client-detail";
import FridgeDetail from "@/pages/fridge-detail";
import ActiveVisit from "@/pages/active-visit";
import Settings from "@/pages/settings";
import GlobalSearch from "@/pages/search";
import RemindersPage from "@/pages/reminders";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 2,
    },
  },
});

function DarkModeSync() {
  const { isDarkMode } = useUiStore();

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);

    if (Capacitor.isNativePlatform()) {
      import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
        StatusBar.setStyle({ style: isDarkMode ? Style.Dark : Style.Light }).catch(() => {});
        StatusBar.setBackgroundColor({ color: isDarkMode ? "#09090b" : "#ffffff" }).catch(() => {});
      }).catch(() => {});
    }
  }, [isDarkMode]);

  return null;
}

function LockOnBlur() {
  const { lockEnabled, setLocked } = useUiStore();

  useEffect(() => {
    if (!lockEnabled) return;

    if (Capacitor.isNativePlatform()) {
      let cleanup: (() => void) | null = null;

      import("@capacitor/app").then(({ App: CapApp }) => {
        CapApp.addListener("appStateChange", ({ isActive }) => {
          if (!isActive) setLocked(true);
        }).then((listener) => {
          cleanup = () => listener.remove();
        }).catch(() => {});
      }).catch(() => {});

      return () => {
        cleanup?.();
      };
    }

    const handleVisibility = () => {
      if (document.hidden) setLocked(true);
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [lockEnabled, setLocked]);

  return null;
}

function Router() {
  return (
    <AppShell>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/clients" component={ClientsList} />
        <Route path="/client/:id" component={ClientDetail} />
        <Route path="/fridge/:id" component={FridgeDetail} />
        <Route path="/visit/:id" component={ActiveVisit} />
        <Route path="/search" component={GlobalSearch} />
        <Route path="/settings" component={Settings} />
        <Route path="/reminders" component={RemindersPage} />
        <Route component={NotFound} />
      </Switch>
    </AppShell>
  );
}

function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    seedDatabase().then(() => {
      setIsReady(true);
      if (Capacitor.isNativePlatform()) {
        import("@capacitor/splash-screen")
          .then(({ SplashScreen }) => SplashScreen.hide({ fadeOutDuration: 300 }))
          .catch(() => {});
        import("@capacitor/keyboard")
          .then(({ Keyboard }) => Keyboard.setAccessoryBarVisible({ isVisible: false }))
          .catch(() => {});
      }
    });
  }, []);

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DarkModeSync />
        <LockOnBlur />
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
