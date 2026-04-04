import { useParams, Link, useLocation } from "wouter";
import { haptic } from "@/lib/native/haptics";
import { getCurrentPosition } from "@/lib/native/geolocation";
import { openMapsNavigation } from "@/lib/native/appLauncher";
import { shareText } from "@/lib/native/share";
import { copyToClipboard } from "@/lib/native/clipboard";
import { useClient, useDeleteClient, useUpdateClient } from "@/hooks/useClients";
import { useClientFridges } from "@/hooks/useFridges";
import { useClientVisits, useStartVisit } from "@/hooks/useVisits";
import { useEntityImages, useAddImage, useDeleteImage } from "@/hooks/useImages";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ImageCapture } from "@/components/ui/image-capture";
import { ImageGallery } from "@/components/ui/image-gallery";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  MapPin, Phone, Mail, Clock, Store, Plus, ChevronLeft, Trash2, Edit,
  Calendar, DollarSign, RefreshCw, Archive, ArchiveRestore, Navigation, Share2, Copy, CheckCheck,
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ClientForm } from "@/components/forms/ClientForm";
import { FridgeForm } from "@/components/forms/FridgeForm";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUiStore } from "@/store/uiStore";
import { COLOR_LABEL_STYLES, type ColorLabel } from "@/lib/schema";
import { cn } from "@/lib/utils";

export default function ClientDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { openCreateFridge, isCreateFridgeOpen, createFridgeForClientId, closeCreateFridge } = useUiStore();

  const { data: client, isLoading } = useClient(id);
  const { data: fridges } = useClientFridges(id);
  const { data: visits } = useClientVisits(id);
  const { data: images } = useEntityImages("client", id);
  const addImageMutation = useAddImage("client", id);
  const deleteImageMutation = useDeleteImage("client", id);

  const startVisitMutation = useStartVisit();
  const deleteMutation = useDeleteClient();
  const updateMutation = useUpdateClient();
  const { data: allVisits } = useClientVisits(id);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isStartingVisit, setIsStartingVisit] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [archiveConfirmOpen, setArchiveConfirmOpen] = useState(false);
  const [phoneCopied, setPhoneCopied] = useState(false);

  const activeClientVisit = allVisits?.find((v) => v.status === "active");

  const handleStartVisit = () => {
    if (activeClientVisit) {
      setLocation(`/visit/${activeClientVisit.id}`);
      return;
    }
    setIsStartingVisit(true);
    getCurrentPosition()
      .then((pos) => {
        startVisitMutation.mutate(
          { clientId: id, lat: pos.lat, lng: pos.lng },
          {
            onSuccess: (visit) => { haptic.success(); setIsStartingVisit(false); setLocation(`/visit/${visit.id}`); },
            onError: () => setIsStartingVisit(false),
          }
        );
      })
      .catch(() => {
        // GPS denied or unavailable — start visit without location
        startVisitMutation.mutate(
          { clientId: id },
          {
            onSuccess: (visit) => { haptic.success(); setIsStartingVisit(false); setLocation(`/visit/${visit.id}`); },
            onError: () => setIsStartingVisit(false),
          }
        );
      });
  };

  const handleDelete = () => {
    deleteMutation.mutate(id, {
      onSuccess: () => {
        toast({ title: "Client deleted" });
        setLocation("/clients");
      },
    });
  };

  const handleArchiveToggle = () => {
    updateMutation.mutate(
      { id, data: { isArchived: !client?.isArchived } as any },
      {
        onSuccess: () => {
          toast({ title: client?.isArchived ? "Client restored" : "Client archived" });
          setArchiveConfirmOpen(false);
          if (!client?.isArchived) setLocation("/clients");
        },
      }
    );
  };

  const handleShare = async () => {
    if (!client) return;
    const addr = [client.address, client.subAddress, client.pincode].filter(Boolean).join(", ");
    const lines = [client.name, addr, client.phone, client.email].filter(Boolean);
    await shareText(client.name, lines.join("\n"));
  };

  const handleCopyPhone = async () => {
    if (!client?.phone) return;
    await copyToClipboard(client.phone);
    setPhoneCopied(true);
    setTimeout(() => setPhoneCopied(false), 2000);
  };

  if (isLoading) return <div className="p-6 animate-pulse bg-primary/5 h-screen rounded-b-3xl" />;
  if (!client) return <div className="p-6">Client not found.</div>;

  const daysSinceVisit = client.lastVisitAt
    ? differenceInDays(new Date(), new Date(client.lastVisitAt))
    : null;

  const labelStyle = client.colorLabel ? COLOR_LABEL_STYLES[client.colorLabel as ColorLabel] : null;

  return (
    <div className="min-h-full bg-background flex flex-col">
      {/* Header */}
      <div
        className={cn(
          "bg-card border-b border-border sticky top-0 z-10",
          labelStyle && `border-l-4 ${labelStyle.border}`
        )}
      >
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/clients")} className="-ml-2">
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleShare}
              title="Share client info"
            >
              <Share2 className="w-5 h-5 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setArchiveConfirmOpen(true)}
              className="hover:bg-muted"
              title={client.isArchived ? "Unarchive" : "Archive"}
            >
              {client.isArchived
                ? <ArchiveRestore className="w-5 h-5 text-muted-foreground" />
                : <Archive className="w-5 h-5 text-muted-foreground" />
              }
            </Button>
            <Button variant="ghost" size="icon" onClick={() => setIsEditOpen(true)}>
              <Edit className="w-5 h-5 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteConfirmOpen(true)}
              className="hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <div className="px-6 pb-5">
          <div className="flex items-start gap-2 mb-3">
            {labelStyle && (
              <span className={cn("mt-1.5 w-3 h-3 rounded-full shrink-0", labelStyle.dot)} />
            )}
            <h1 className="text-2xl font-bold leading-tight">{client.name}</h1>
          </div>

          {client.isArchived && (
            <div className="mb-3 px-2.5 py-1 rounded-full bg-muted text-xs font-semibold text-muted-foreground inline-flex items-center gap-1.5">
              <Archive className="w-3 h-3" /> Archived
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-3">
            <StatusBadge status={client.status} />
            <span className="px-2.5 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold border border-border">
              {client.shopType}
            </span>
            {client.tags.map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded text-[10px] bg-muted uppercase tracking-wider font-semibold">
                {tag}
              </span>
            ))}
          </div>

          <div className="space-y-1.5 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-primary/60" />
              <span className="flex-1">
                {client.address}
                {client.subAddress && `, ${client.subAddress}`}
                {client.pincode && ` — ${client.pincode}`}
              </span>
              <button
                onClick={() => openMapsNavigation(client.address)}
                className="shrink-0 p-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                title="Navigate"
              >
                <Navigation className="w-3.5 h-3.5" />
              </button>
            </div>
            {client.phone && (
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 shrink-0 text-primary/60" />
                <a href={`tel:${client.phone}`} className="text-primary hover:underline flex-1">{client.phone}</a>
                <button onClick={handleCopyPhone} className="text-muted-foreground hover:text-foreground transition-colors p-0.5" title="Copy phone">
                  {phoneCopied ? <CheckCheck className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
            {client.email && (
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 shrink-0 text-primary/60" />
                <a href={`mailto:${client.email}`} className="text-primary hover:underline truncate">{client.email}</a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="flex-1 flex flex-col">
        <div className="px-4 pt-3">
          <TabsList className="w-full grid grid-cols-3 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="overview" className="rounded-lg text-xs">Overview</TabsTrigger>
            <TabsTrigger value="assets" className="rounded-lg text-xs">
              Assets ({fridges?.length ?? 0})
            </TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg text-xs">
              Visits ({visits?.length ?? 0})
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 p-4 pb-6">
          {/* OVERVIEW */}
          <TabsContent value="overview" className="m-0 space-y-4 outline-none">
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl border border-border bg-card text-center">
                <Calendar className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground mb-0.5">Last Visit</p>
                <p className="font-semibold text-xs">
                  {daysSinceVisit !== null ? `${daysSinceVisit}d ago` : "Never"}
                </p>
              </div>
              <div className="p-3 rounded-xl border border-border bg-card text-center">
                <RefreshCw className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground mb-0.5">Frequency</p>
                <p className="font-semibold text-xs">
                  {client.visitFrequency ? `${client.visitFrequency}d` : "—"}
                </p>
              </div>
              <div className="p-3 rounded-xl border border-border bg-card text-center">
                <DollarSign className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                <p className="text-[10px] text-muted-foreground mb-0.5">Monthly Value</p>
                <p className="font-semibold text-xs">
                  {client.monthlyValueEstimate ? `$${client.monthlyValueEstimate.toLocaleString()}` : "—"}
                </p>
              </div>
            </div>

            {client.notes && (
              <Card className="bg-primary/5 border-transparent shadow-none">
                <CardContent className="p-4">
                  <h3 className="text-xs font-semibold mb-1 text-primary uppercase tracking-wide">Notes</h3>
                  <p className="text-sm">{client.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Photos */}
            <div className="space-y-3">
              <h3 className="font-semibold text-sm">Photos</h3>
              {images && images.length > 0 && (
                <ImageGallery images={images} onDelete={(imgId) => deleteImageMutation.mutate(imgId)} />
              )}
              <ImageCapture
                entityType="client"
                entityId={id}
                onCapture={(file) => addImageMutation.mutateAsync({ file })}
                label="Add Client Photo"
              />
            </div>

            <Button
              className="w-full h-14 text-base rounded-xl shadow-lg shadow-primary/25 hover:-translate-y-0.5 transition-transform"
              onClick={handleStartVisit}
              disabled={isStartingVisit || startVisitMutation.isPending || client.isArchived}
            >
              <Store className="w-5 h-5 mr-2" />
              {activeClientVisit ? "Resume Active Visit" : isStartingVisit ? "Getting location..." : "Start Visit"}
            </Button>
          </TabsContent>

          {/* ASSETS */}
          <TabsContent value="assets" className="m-0 space-y-3 outline-none">
            {fridges?.map((fridge) => (
              <Link key={fridge.id} href={`/fridge/${fridge.id}`}>
                <Card className="hover-elevate cursor-pointer border-border">
                  <CardContent className="p-4 flex justify-between items-center">
                    <div>
                      <p className="font-bold">Asset #{fridge.serialNo.slice(-4)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 font-mono">SN: {fridge.serialNo}</p>
                      {fridge.gccCode && (
                        <p className="text-xs text-muted-foreground font-mono">GCC: {fridge.gccCode}</p>
                      )}
                    </div>
                    <StatusBadge status={fridge.condition} />
                  </CardContent>
                </Card>
              </Link>
            ))}
            {fridges?.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <p className="text-sm">No assets linked yet.</p>
              </div>
            )}
            <Button
              variant="outline"
              className="w-full border-dashed h-12 rounded-xl"
              onClick={() => openCreateFridge(id)}
            >
              <Plus className="w-4 h-4 mr-2" /> Add Asset / Fridge
            </Button>
          </TabsContent>

          {/* HISTORY */}
          <TabsContent value="history" className="m-0 outline-none space-y-3">
            {visits?.map((visit) => (
              <Card key={visit.id} className="border-border">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="font-semibold text-sm">
                        {format(new Date(visit.startedAt), "MMM d, yyyy · h:mm a")}
                      </span>
                    </div>
                    <StatusBadge status={visit.status} />
                  </div>
                  {visit.notes && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{visit.notes}</p>
                  )}
                  {visit.followUpOutcome && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wide mb-0.5">Follow-up</p>
                      <p className="text-xs text-muted-foreground">{visit.followUpOutcome}</p>
                    </div>
                  )}
                  {visit.fridgesChecked.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {visit.fridgesChecked.length} asset{visit.fridgesChecked.length > 1 ? "s" : ""} checked
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
            {visits?.length === 0 && (
              <div className="text-center py-10 text-muted-foreground">
                <p className="text-sm">No visits recorded yet.</p>
              </div>
            )}
          </TabsContent>
        </div>
      </Tabs>

      {/* Edit Client Sheet */}
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent side="bottom" className="h-[90vh] rounded-t-2xl px-6 py-6 overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl">Edit Client</SheetTitle>
          </SheetHeader>
          {client && (
            <ClientForm
              initialData={{ ...client, tags: client.tags.join(", ") as any }}
              onSuccess={() => setIsEditOpen(false)}
            />
          )}
        </SheetContent>
      </Sheet>

      {/* Add Asset Sheet */}
      <Sheet
        open={isCreateFridgeOpen && createFridgeForClientId === id}
        onOpenChange={(open) => !open && closeCreateFridge()}
      >
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl px-6 py-6 overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl">Add Asset / Fridge</SheetTitle>
          </SheetHeader>
          <FridgeForm clientId={id} onSuccess={closeCreateFridge} />
        </SheetContent>
      </Sheet>

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Client?"
        description="All linked assets and visits will also be permanently removed. This cannot be undone."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />

      {/* Archive Confirm */}
      <ConfirmDialog
        open={archiveConfirmOpen}
        onOpenChange={setArchiveConfirmOpen}
        title={client.isArchived ? "Restore Client?" : "Archive Client?"}
        description={
          client.isArchived
            ? "This client will be moved back to your active list."
            : "The client will be hidden from your main list. All data is preserved and can be restored at any time."
        }
        confirmLabel={client.isArchived ? "Restore" : "Archive"}
        onConfirm={handleArchiveToggle}
      />
    </div>
  );
}
