import { useParams, useLocation } from "wouter";
import { useFridge, useUpdateFridge, useDeleteFridge, useTransferFridge } from "@/hooks/useFridges";
import { useClient, useClients } from "@/hooks/useClients";
import { useEntityImages, useAddImage, useDeleteImage } from "@/hooks/useImages";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { ImageCapture } from "@/components/ui/image-capture";
import { ImageGallery } from "@/components/ui/image-gallery";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { QrScanner } from "@/components/ui/qr-scanner";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ChevronLeft, QrCode, ThermometerSnowflake, Trash2, Copy, CheckCircle, ScanLine, ArrowLeftRight, Search, Store } from "lucide-react";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import { FridgeConditionEnum, type FridgeCondition } from "@/lib/schema";
import { useToast } from "@/hooks/use-toast";
import { copyToClipboard } from "@/lib/native/clipboard";
import { cn } from "@/lib/utils";

export default function FridgeDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: fridge, isLoading: fridgeLoading } = useFridge(id);
  const { data: client } = useClient(fridge?.clientId ?? "");
  const { data: allClients } = useClients();
  const { data: images } = useEntityImages("fridge", id);
  const addImageMutation = useAddImage("fridge", id);
  const deleteImageMutation = useDeleteImage("fridge", id);
  const updateMutation = useUpdateFridge();
  const deleteMutation = useDeleteFridge();
  const transferMutation = useTransferFridge();

  const [condition, setCondition] = useState<FridgeCondition>("Good");
  const [notes, setNotes] = useState("");
  const [qrCodeValue, setQrCodeValue] = useState("");
  const [gccCode, setGccCode] = useState("");
  const [qrCopied, setQrCopied] = useState(false);
  const [serialCopied, setSerialCopied] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferSearch, setTransferSearch] = useState("");
  const [transferConfirmClient, setTransferConfirmClient] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (fridge) {
      setCondition(fridge.condition);
      setNotes(fridge.notes ?? "");
      setQrCodeValue(fridge.qrCodeValue ?? "");
      setGccCode(fridge.gccCode ?? "");
      setIsDirty(false);
    }
  }, [fridge]);

  const markDirty = () => setIsDirty(true);

  const handleSave = () => {
    updateMutation.mutate(
      { id, data: { condition, notes, qrCodeValue, gccCode } },
      { onSuccess: () => { toast({ title: "Asset updated" }); setIsDirty(false); } }
    );
  };

  const handleDelete = () => {
    deleteMutation.mutate(
      { id, clientId: fridge!.clientId },
      {
        onSuccess: () => {
          toast({ title: "Asset deleted" });
          setLocation(`/client/${fridge!.clientId}`);
        },
      }
    );
  };

  const handleCopyQr = async () => {
    if (!qrCodeValue) return;
    await copyToClipboard(qrCodeValue);
    setQrCopied(true);
    setTimeout(() => setQrCopied(false), 2000);
  };

  const handleCopySerial = async () => {
    await copyToClipboard(fridge!.serialNo);
    setSerialCopied(true);
    setTimeout(() => setSerialCopied(false), 2000);
  };

  const handleQrScan = (value: string) => {
    setQrCodeValue(value);
    markDirty();
    toast({ title: "QR Code scanned", description: value.slice(0, 40) });
  };

  const handleTransfer = () => {
    if (!transferConfirmClient) return;
    transferMutation.mutate(
      { id, newClientId: transferConfirmClient.id },
      {
        onSuccess: () => {
          toast({ title: "Asset transferred", description: `Moved to ${transferConfirmClient.name}` });
          setTransferOpen(false);
          setTransferConfirmClient(null);
          setLocation(`/client/${transferConfirmClient.id}`);
        },
      }
    );
  };

  const transferableClients = allClients?.filter(
    c => !c.isArchived && c.id !== fridge?.clientId &&
      (transferSearch === "" ||
        c.name.toLowerCase().includes(transferSearch.toLowerCase()) ||
        c.address.toLowerCase().includes(transferSearch.toLowerCase()))
  ) ?? [];

  if (fridgeLoading) return <div className="p-6 animate-pulse bg-primary/5 h-screen" />;
  if (!fridge) return <div className="p-6">Asset not found.</div>;

  return (
    <div className="min-h-full bg-background flex flex-col">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="-ml-2">
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTransferOpen(true)}
              title="Transfer to another client"
            >
              <ArrowLeftRight className="w-5 h-5 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setDeleteConfirmOpen(true)}
              className="text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-6 pb-8">
        {/* Identity */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl mx-auto flex items-center justify-center">
            <ThermometerSnowflake className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Asset #{fridge.serialNo.slice(-4)}</h1>
            <p className="text-muted-foreground text-sm">{client?.name}</p>
          </div>
          <StatusBadge status={fridge.condition} className="text-sm px-3 py-1" />
        </div>

        {/* Info Grid */}
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            <div className="p-4 flex justify-between items-center gap-2">
              <span className="text-muted-foreground text-sm shrink-0">Serial Number</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-medium text-sm">{fridge.serialNo}</span>
                <button
                  onClick={handleCopySerial}
                  className="text-muted-foreground hover:text-foreground transition-colors p-0.5 shrink-0"
                  title="Copy serial"
                >
                  {serialCopied
                    ? <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="text-muted-foreground text-sm">Installed</span>
              <span className="font-medium text-sm">
                {fridge.installationDate
                  ? format(new Date(fridge.installationDate), "MMM d, yyyy")
                  : "Unknown"}
              </span>
            </div>
            {fridge.lastCheckedAt && (
              <div className="p-4 flex justify-between items-center">
                <span className="text-muted-foreground text-sm">Last Checked</span>
                <span className="font-medium text-sm">
                  {format(new Date(fridge.lastCheckedAt), "MMM d, yyyy")}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* QR / GCC Section */}
        <div className="space-y-3">
          <h3 className="font-bold flex items-center gap-2">
            <QrCode className="w-5 h-5" /> Identification Codes
          </h3>

          <div className="space-y-2">
            <label className="text-sm font-medium">GCC Code</label>
            <Input
              value={gccCode}
              onChange={(e) => { setGccCode(e.target.value); markDirty(); }}
              placeholder="GCC-A000"
              className="font-mono bg-card"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">QR Code Value</label>
            <div className="flex gap-2">
              <Input
                value={qrCodeValue}
                onChange={(e) => { setQrCodeValue(e.target.value); markDirty(); }}
                placeholder="Scan or enter manually..."
                className="font-mono bg-card flex-1 text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setQrScannerOpen(true)}
                className="shrink-0"
                title="Scan QR Code"
              >
                <ScanLine className="w-4 h-4" />
              </Button>
              {qrCodeValue && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopyQr}
                  className="shrink-0"
                >
                  {qrCopied ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
            {qrCodeValue && (
              <div className="bg-muted rounded-lg p-3 flex items-center gap-2">
                <QrCode className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="font-mono text-xs text-muted-foreground break-all">{qrCodeValue}</p>
              </div>
            )}
          </div>
        </div>

        {/* Status Update */}
        <div className="space-y-3">
          <h3 className="font-bold">Condition Update</h3>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Condition</label>
            <Select
              value={condition}
              onValueChange={(v: FridgeCondition) => { setCondition(v); markDirty(); }}
            >
              <SelectTrigger className="h-12 bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FridgeConditionEnum.options.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Maintenance Notes</label>
            <Textarea
              value={notes}
              onChange={(e) => { setNotes(e.target.value); markDirty(); }}
              placeholder="Log any issues, repairs, or visual condition..."
              className="resize-none bg-card"
              rows={3}
            />
          </div>

          <Button
            className="w-full h-12 rounded-xl"
            onClick={handleSave}
            disabled={updateMutation.isPending || !isDirty}
          >
            {updateMutation.isPending ? "Saving..." : "Save Update"}
          </Button>
        </div>

        {/* Photo Gallery */}
        <div className="space-y-3">
          <h3 className="font-bold">Photos & Proof</h3>
          {images && images.length > 0 && (
            <ImageGallery
              images={images}
              onDelete={(imgId) => deleteImageMutation.mutate(imgId)}
            />
          )}
          <ImageCapture
            entityType="fridge"
            entityId={id}
            onCapture={(file) => addImageMutation.mutateAsync({ file })}
            label="Take Asset Photo"
          />
        </div>
      </div>

      {/* Delete Confirm Modal */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Asset?"
        description="This asset and all its data will be permanently removed."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={handleDelete}
      />

      {/* Transfer Confirm Modal */}
      <ConfirmDialog
        open={!!transferConfirmClient}
        onOpenChange={(open) => { if (!open) setTransferConfirmClient(null); }}
        title="Transfer Asset?"
        description={`Move this asset to ${transferConfirmClient?.name}? The asset history stays intact.`}
        confirmLabel="Transfer"
        onConfirm={handleTransfer}
      />

      {/* QR Scanner */}
      <QrScanner
        open={qrScannerOpen}
        onOpenChange={setQrScannerOpen}
        onScan={handleQrScan}
      />

      {/* Transfer Sheet */}
      <Sheet open={transferOpen} onOpenChange={(open) => { setTransferOpen(open); if (!open) setTransferSearch(""); }}>
        <SheetContent side="bottom" className="h-[75vh] rounded-t-2xl flex flex-col px-0 pb-0">
          <SheetHeader className="px-6 pt-6 pb-3 shrink-0">
            <SheetTitle className="text-xl">Transfer Asset</SheetTitle>
            <SheetDescription>
              Move this fridge to a different client. Visit history stays intact.
            </SheetDescription>
          </SheetHeader>

          <div className="px-6 pb-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={transferSearch}
                onChange={(e) => setTransferSearch(e.target.value)}
                placeholder="Search clients..."
                className="pl-9 bg-muted/50"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-2">
            {transferableClients.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Store className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p className="text-sm">No other clients found.</p>
              </div>
            ) : (
              transferableClients.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setTransferConfirmClient({ id: c.id, name: c.name }); }}
                  className={cn(
                    "w-full text-left p-4 rounded-xl border border-border bg-card hover:bg-muted/60 transition-colors",
                    "flex items-center justify-between gap-3"
                  )}
                >
                  <div>
                    <p className="font-semibold text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.address}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </button>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
