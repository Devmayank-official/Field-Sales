import { useState } from "react";
import { Link } from "wouter";
import { useClients, useUpdateClient } from "@/hooks/useClients";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Search, MapPin, Store, Phone, CheckSquare, X, Archive, Tag } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { COLOR_LABEL_STYLES, type ColorLabel } from "@/lib/schema";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

const STATUS_TABS = ["All", "Active", "High Value", "Lead", "Contacted", "Inactive", "Archived"] as const;

interface CardInnerProps {
  client: import("@/lib/schema").Client;
  isOverdue: boolean;
  labelStyle: { border: string; dot: string; bg: string; text: string } | null;
  isSelected: boolean;
  selectMode: boolean;
  daysSince: number | null;
}

function CardInner({ client, isOverdue, labelStyle, isSelected, selectMode, daysSince }: CardInnerProps) {
  return (
    <Card
      className={cn(
        "border-transparent shadow-sm transition-all overflow-hidden",
        !selectMode && "hover-elevate hover:border-border",
        isOverdue && "border-amber-500/30 bg-amber-500/5",
        labelStyle && `border-l-4 ${labelStyle.border}`,
        isSelected && "ring-2 ring-primary ring-offset-1 bg-primary/5",
      )}
    >
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {selectMode && (
              <div className={cn(
                "w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all",
                isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
              )}>
                {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
              </div>
            )}
            <h3 className="font-bold text-base leading-tight line-clamp-1 pr-2">{client.name}</h3>
          </div>
          <StatusBadge status={client.status} />
        </div>
        <div className="space-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="line-clamp-1">{client.address}</span>
          </div>
          {client.phone && (
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 shrink-0" />
              <span>{client.phone}</span>
            </div>
          )}
        </div>
        <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-border/50">
          <span className="text-xs font-medium flex items-center gap-1 text-muted-foreground">
            <Store className="w-3.5 h-3.5" />
            {client.shopType}
          </span>
          <span className={cn(
            "text-xs font-medium",
            isOverdue ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
          )}>
            {daysSince !== null ? `${daysSince}d ago` : "Never visited"}
            {isOverdue && " ⚠"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function ClientsList() {
  const { data: clients, isLoading } = useClients();
  const updateMutation = useUpdateClient();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<string>("All");
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [bulkTag, setBulkTag] = useState("");

  const today = new Date();

  const filteredClients = clients?.filter((c) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q) ||
      (c.phone ?? "").toLowerCase().includes(q) ||
      (c.pincode ?? "").includes(q) ||
      c.tags.some((t) => t.toLowerCase().includes(q)) ||
      (c.shopType ?? "").toLowerCase().includes(q);

    if (activeTab === "Archived") return matchesSearch && c.isArchived === true;
    const matchesTab = activeTab === "All" || c.status === activeTab;
    return matchesSearch && matchesTab && !c.isArchived;
  }) ?? [];

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exitSelect = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const handleBulkArchive = async () => {
    const isArchiving = activeTab !== "Archived";
    for (const id of selected) {
      await updateMutation.mutateAsync({ id, data: { isArchived: isArchiving } as any });
    }
    toast({ title: `${selected.size} client${selected.size > 1 ? "s" : ""} ${isArchiving ? "archived" : "unarchived"}` });
    exitSelect();
    setArchiveConfirmOpen(false);
  };

  const handleBulkTag = async () => {
    if (!bulkTag.trim()) return;
    const newTags = bulkTag.split(",").map((t) => t.trim()).filter(Boolean);
    for (const id of selected) {
      const client = clients?.find((c) => c.id === id);
      if (!client) continue;
      const merged = Array.from(new Set([...client.tags, ...newTags]));
      await updateMutation.mutateAsync({ id, data: { tags: merged } as any });
    }
    toast({ title: `Tags added to ${selected.size} client${selected.size > 1 ? "s" : ""}` });
    setBulkTag("");
    setTagDialogOpen(false);
    exitSelect();
  };

  const countForTab = (tab: string) => {
    if (!clients) return 0;
    if (tab === "Archived") return clients.filter((c) => c.isArchived).length;
    if (tab === "All") return clients.filter((c) => !c.isArchived).length;
    return clients.filter((c) => c.status === tab && !c.isArchived).length;
  };

  return (
    <div className="min-h-full bg-background flex flex-col">
      <div className="sticky top-0 z-10 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Clients</h1>
          {!selectMode ? (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground"
              onClick={() => setSelectMode(true)}
            >
              <CheckSquare className="w-4 h-4" /> Select
            </Button>
          ) : (
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={exitSelect}>
              <X className="w-4 h-4" /> Cancel
            </Button>
          )}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, address, phone, tag..."
            className="pl-9 h-11 bg-card rounded-xl border-transparent shadow-sm focus-visible:ring-primary/50"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-0.5">
          {STATUS_TABS.map((tab) => {
            const count = countForTab(tab);
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1",
                  activeTab === tab
                    ? "bg-foreground text-background shadow"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {tab}
                <span className={cn("text-[10px]", activeTab === tab ? "opacity-70" : "opacity-50")}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-4 space-y-3 flex-1 pb-4">
        {isLoading ? (
          Array(5).fill(0).map((_, i) => (
            <div key={i} className="h-24 bg-primary/5 animate-pulse rounded-2xl" />
          ))
        ) : filteredClients.length > 0 ? (
          <AnimatePresence>
            {filteredClients.map((client, index) => {
              const daysSince = client.lastVisitAt
                ? differenceInDays(today, new Date(client.lastVisitAt))
                : null;
              const isOverdue =
                daysSince !== null &&
                daysSince > (client.visitFrequency ?? 14) &&
                (client.status === "Active" || client.status === "High Value");
              const labelStyle = client.colorLabel
                ? COLOR_LABEL_STYLES[client.colorLabel as ColorLabel]
                : null;
              const isSelected = selected.has(client.id);

              return (
                <motion.div
                  key={client.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.04, 0.3) }}
                >
                  {selectMode ? (
                    <div onClick={() => toggleSelect(client.id)} className="cursor-pointer">
                      <CardInner
                        client={client}
                        isOverdue={isOverdue}
                        labelStyle={labelStyle}
                        isSelected={isSelected}
                        selectMode={selectMode}
                        daysSince={daysSince}
                      />
                    </div>
                  ) : (
                    <Link href={`/client/${client.id}`}>
                      <CardInner
                        client={client}
                        isOverdue={isOverdue}
                        labelStyle={labelStyle}
                        isSelected={false}
                        selectMode={false}
                        daysSince={daysSince}
                      />
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <Store className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-base font-medium">No clients found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters.</p>
          </div>
        )}
      </div>

      {/* Bulk Action Bar */}
      <AnimatePresence>
        {selectMode && selected.size > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-20 left-0 right-0 px-4 z-50"
          >
            <div className="bg-card border border-border shadow-xl rounded-2xl p-3 flex items-center justify-between gap-2 max-w-3xl mx-auto">
              <span className="text-sm font-semibold pl-1">{selected.size} selected</span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 rounded-xl"
                  onClick={() => setTagDialogOpen(true)}
                >
                  <Tag className="w-3.5 h-3.5" /> Tag
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 rounded-xl"
                  onClick={() => setArchiveConfirmOpen(true)}
                >
                  <Archive className="w-3.5 h-3.5" />
                  {activeTab === "Archived" ? "Unarchive" : "Archive"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Archive Confirm */}
      <ConfirmDialog
        open={archiveConfirmOpen}
        onOpenChange={setArchiveConfirmOpen}
        title={activeTab === "Archived" ? `Unarchive ${selected.size} client${selected.size > 1 ? "s" : ""}?` : `Archive ${selected.size} client${selected.size > 1 ? "s" : ""}?`}
        description={activeTab === "Archived" ? "These clients will be restored to your active list." : "Archived clients are hidden from the main list but all their data is preserved."}
        confirmLabel={activeTab === "Archived" ? "Unarchive" : "Archive"}
        onConfirm={handleBulkArchive}
      />

      {/* Bulk Tag Dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent className="max-w-[92vw] rounded-2xl">
          <DialogHeader>
            <DialogTitle>Add Tags to {selected.size} Clients</DialogTitle>
          </DialogHeader>
          <Input
            value={bulkTag}
            onChange={(e) => setBulkTag(e.target.value)}
            placeholder="Priority, Wholesale, Seasonal"
            autoFocus
          />
          <p className="text-xs text-muted-foreground -mt-2">Comma-separated. Existing tags won't be removed.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setTagDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBulkTag} disabled={!bulkTag.trim()}>Apply Tags</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
