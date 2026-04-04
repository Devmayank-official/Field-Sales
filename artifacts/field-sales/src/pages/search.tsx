import { useState } from "react";
import { Link } from "wouter";
import { useClients } from "@/hooks/useClients";
import { useAllFridges } from "@/hooks/useFridges";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Search, Store, ThermometerSnowflake, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function GlobalSearch() {
  const [query, setQuery] = useState("");
  const { data: clients } = useClients();
  const { data: fridges } = useAllFridges();

  const q = query.trim().toLowerCase();

  const matchedClients =
    q.length >= 1
      ? (clients ?? []).filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            (c.phone ?? "").includes(q) ||
            (c.email ?? "").toLowerCase().includes(q) ||
            c.address.toLowerCase().includes(q) ||
            (c.pincode ?? "").includes(q) ||
            c.shopType.toLowerCase().includes(q) ||
            c.tags.some((t) => t.toLowerCase().includes(q))
        )
      : [];

  const matchedFridges =
    q.length >= 1
      ? (fridges ?? []).filter(
          (f) =>
            f.serialNo.toLowerCase().includes(q) ||
            (f.gccCode ?? "").toLowerCase().includes(q) ||
            (f.qrCodeValue ?? "").toLowerCase().includes(q) ||
            (f.notes ?? "").toLowerCase().includes(q)
        )
      : [];

  const hasResults = matchedClients.length > 0 || matchedFridges.length > 0;
  const noResults = q.length >= 1 && !hasResults;

  // Get client name for fridge
  const clientMap = Object.fromEntries((clients ?? []).map((c) => [c.id, c]));

  return (
    <div className="min-h-full bg-background flex flex-col">
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-4 space-y-3">
        <h1 className="text-2xl font-bold">Search</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clients, GCC codes, serials..."
            autoFocus
            className="pl-9 h-11 bg-card rounded-xl border-transparent shadow-sm focus-visible:ring-primary/50"
          />
        </div>
        {q && (
          <p className="text-xs text-muted-foreground">
            {matchedClients.length + matchedFridges.length} result{matchedClients.length + matchedFridges.length !== 1 ? "s" : ""} for &ldquo;{query}&rdquo;
          </p>
        )}
      </div>

      <div className="p-4 space-y-5 flex-1">
        {!q && (
          <div className="text-center py-20 text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium">Search across everything</p>
            <p className="text-sm mt-1">Clients, GCC codes, serial numbers, pincodes...</p>
          </div>
        )}

        {noResults && (
          <div className="text-center py-16 text-muted-foreground">
            <p className="font-medium">No results found</p>
            <p className="text-sm mt-1">Try a different keyword.</p>
          </div>
        )}

        <AnimatePresence>
          {matchedClients.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
                Clients ({matchedClients.length})
              </h2>
              {matchedClients.map((client) => (
                <Link key={client.id} href={`/client/${client.id}`}>
                  <Card className="hover-elevate cursor-pointer border-transparent shadow-sm hover:border-border transition-all">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Store className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-semibold truncate">{client.name}</p>
                          <StatusBadge status={client.status} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {client.address}
                          {client.pincode && ` · ${client.pincode}`}
                        </p>
                        {client.phone && (
                          <p className="text-xs text-muted-foreground">{client.phone}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </motion.section>
          )}

          {matchedFridges.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-2"
            >
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
                Assets / Fridges ({matchedFridges.length})
              </h2>
              {matchedFridges.map((fridge) => {
                const client = clientMap[fridge.clientId];
                return (
                  <Link key={fridge.id} href={`/fridge/${fridge.id}`}>
                    <Card className="hover-elevate cursor-pointer border-transparent shadow-sm hover:border-border transition-all">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <ThermometerSnowflake className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold font-mono truncate">{fridge.serialNo}</p>
                            <StatusBadge status={fridge.condition} />
                          </div>
                          {fridge.gccCode && (
                            <p className="text-xs text-muted-foreground font-mono">GCC: {fridge.gccCode}</p>
                          )}
                          {client && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              <p className="text-xs text-muted-foreground truncate">{client.name}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
