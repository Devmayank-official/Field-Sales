import { useParams, useLocation } from "wouter";
import { useAllVisits, useEndVisit } from "@/hooks/useVisits";
import { useClient } from "@/hooks/useClients";
import { useClientFridges } from "@/hooks/useFridges";
import { useEntityImages, useAddImage, useDeleteImage } from "@/hooks/useImages";
import { ImageCapture } from "@/components/ui/image-capture";
import { ImageGallery } from "@/components/ui/image-gallery";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { MapPin, Clock, CheckCircle2, ChevronLeft, Navigation, Share2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { haptic } from "@/lib/native/haptics";
import { getCurrentPosition } from "@/lib/native/geolocation";
import { shareText } from "@/lib/native/share";

export default function ActiveVisit() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: visits, isLoading: visitsLoading } = useAllVisits();
  const visit = visits?.find((v) => v.id === id);

  const { data: client } = useClient(visit?.clientId ?? "");
  const { data: fridges } = useClientFridges(visit?.clientId ?? "");
  const { data: images } = useEntityImages("visit", id);
  const addImageMutation = useAddImage("visit", id);
  const deleteImageMutation = useDeleteImage("visit", id);

  const endVisitMutation = useEndVisit();

  const [notes, setNotes] = useState("");
  const [followUpOutcome, setFollowUpOutcome] = useState("");
  const [checkedFridges, setCheckedFridges] = useState<Set<string>>(new Set());
  const [duration, setDuration] = useState("00:00");
  const [locationNote, setLocationNote] = useState("");
  const [gpsStatus, setGpsStatus] = useState<"idle" | "fetching" | "done" | "denied">("idle");
  const [completeConfirmOpen, setCompleteConfirmOpen] = useState(false);

  useEffect(() => {
    if (!visit?.startedAt) return;
    const interval = setInterval(() => {
      const diff = Date.now() - visit.startedAt;
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setDuration(`${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [visit?.startedAt]);

  const handleToggleFridge = (fridgeId: string) => {
    setCheckedFridges((prev) => {
      const next = new Set(prev);
      if (next.has(fridgeId)) next.delete(fridgeId);
      else next.add(fridgeId);
      return next;
    });
  };

  const handleGetGps = async () => {
    setGpsStatus("fetching");
    try {
      const pos = await getCurrentPosition();
      setLocationNote(`${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`);
      setGpsStatus("done");
    } catch {
      setGpsStatus("denied");
      toast({ title: "Location access denied", variant: "destructive" });
    }
  };

  const handleEndVisit = () => {
    endVisitMutation.mutate(
      {
        id,
        notes,
        followUpOutcome,
        locationNote: locationNote || undefined,
        fridgesChecked: Array.from(checkedFridges),
      },
      {
        onSuccess: () => {
          haptic.success();
          toast({ title: "Visit completed" });
          setLocation(`/client/${visit!.clientId}`);
        },
      }
    );
  };

  const handleShareVisit = async () => {
    if (!visit || !client) return;
    const lines = [
      `Visit: ${client.name}`,
      visit.endedAt ? format(new Date(visit.endedAt), "MMM d, yyyy · h:mm a") : "",
      visit.notes ? `Notes: ${visit.notes}` : "",
      visit.followUpOutcome ? `Follow-up: ${visit.followUpOutcome}` : "",
    ].filter(Boolean);
    await shareText("Visit Summary", lines.join("\n"));
  };

  if (visitsLoading && !visit) {
    return <div className="p-6 animate-pulse bg-primary/5 h-screen" />;
  }

  if (!visit || visit.status === "completed") {
    return (
      <div className="p-6 text-center mt-20 space-y-4">
        <CheckCircle2 className="w-16 h-16 text-primary mx-auto" />
        <h2 className="text-xl font-bold">Visit Completed</h2>
        <p className="text-sm text-muted-foreground">
          {visit?.endedAt && format(new Date(visit.endedAt), "MMM d · h:mm a")}
        </p>
        <Button
          variant="outline"
          onClick={handleShareVisit}
          className="w-full max-w-xs mx-auto flex items-center justify-center gap-2"
        >
          <Share2 className="w-4 h-4" /> Share Summary
        </Button>
        <Button onClick={() => setLocation("/clients")} className="w-full max-w-xs mx-auto">
          Back to Clients
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Visit Header */}
      <div className="bg-primary text-primary-foreground p-5 sticky top-0 z-10 shadow-lg rounded-b-3xl shrink-0">
        <div className="flex justify-between items-center mb-4">
          <Button
            variant="ghost"
            size="icon"
            className="text-white hover:bg-white/20 -ml-2"
            onClick={() => setLocation(`/client/${visit.clientId}`)}
          >
            <ChevronLeft className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-2 bg-black/20 px-3 py-1.5 rounded-full font-mono font-bold text-lg">
            <Clock className="w-4 h-4" />
            {duration}
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-1">{client?.name ?? "Loading..."}</h1>
        <div className="flex items-center gap-1.5 text-primary-foreground/80 text-sm">
          <MapPin className="w-4 h-4 shrink-0" />
          <span className="line-clamp-1">{client?.address}</span>
        </div>
      </div>

      <div className="flex-1 p-5 space-y-7 overflow-y-auto pb-32">
        {/* Asset Checklist */}
        {fridges && fridges.length > 0 && (
          <section className="space-y-3">
            <h3 className="font-bold text-base">Asset Audit</h3>
            <Card className="border-border shadow-sm">
              <CardContent className="p-0 divide-y divide-border">
                {fridges.map((fridge) => (
                  <label
                    key={fridge.id}
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">Asset #{fridge.serialNo.slice(-4)}</p>
                      <p className="text-xs text-muted-foreground font-mono">{fridge.serialNo}</p>
                      <p className="text-xs text-muted-foreground">{fridge.condition}</p>
                    </div>
                    <Checkbox
                      checked={checkedFridges.has(fridge.id)}
                      onCheckedChange={() => handleToggleFridge(fridge.id)}
                      className="w-6 h-6 rounded-full border-2 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                    />
                  </label>
                ))}
              </CardContent>
            </Card>
            {checkedFridges.size > 0 && (
              <p className="text-xs text-muted-foreground pl-1">
                {checkedFridges.size} of {fridges.length} asset{fridges.length > 1 ? "s" : ""} checked
              </p>
            )}
          </section>
        )}

        {/* GPS Location */}
        <section className="space-y-3">
          <h3 className="font-bold text-base">Location</h3>
          <div className="flex gap-2">
            <Input
              value={locationNote}
              onChange={(e) => setLocationNote(e.target.value)}
              placeholder="Enter location or capture GPS..."
              className="bg-card flex-1 font-mono text-sm"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleGetGps}
              disabled={gpsStatus === "fetching"}
              className={gpsStatus === "done" ? "border-green-500 text-green-500" : ""}
            >
              <Navigation
                className={`w-4 h-4 ${gpsStatus === "fetching" ? "animate-pulse" : ""}`}
              />
            </Button>
          </div>
          {gpsStatus === "denied" && (
            <p className="text-xs text-destructive">Location permission denied.</p>
          )}
        </section>

        {/* Visit Notes */}
        <section className="space-y-3">
          <h3 className="font-bold text-base">Visit Notes</h3>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Record orders taken, discussion points, issues..."
            className="min-h-[120px] bg-card border-border resize-none rounded-xl p-4"
          />
        </section>

        {/* Follow-up Outcome */}
        <section className="space-y-3">
          <h3 className="font-bold text-base">Follow-up Outcome</h3>
          <Textarea
            value={followUpOutcome}
            onChange={(e) => setFollowUpOutcome(e.target.value)}
            placeholder="What needs to happen after this visit? e.g. Send price list by Friday..."
            className="min-h-[80px] bg-card border-border resize-none rounded-xl p-4"
            rows={3}
          />
        </section>

        {/* Photo Proof */}
        <section className="space-y-3">
          <h3 className="font-bold text-base">Photo Proof</h3>
          {images && images.length > 0 && (
            <ImageGallery
              images={images}
              onDelete={(imgId) => deleteImageMutation.mutate(imgId)}
            />
          )}
          <ImageCapture
            entityType="visit"
            entityId={id}
            onCapture={(file) => addImageMutation.mutateAsync({ file })}
            label="Add Photo Proof"
          />
        </section>
      </div>

      {/* Sticky End Visit Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/90 backdrop-blur-md border-t border-border">
        <div className="max-w-3xl mx-auto">
          <Button
            className="w-full h-14 text-lg font-bold rounded-xl shadow-lg shadow-primary/30 active:scale-95 transition-transform"
            onClick={() => setCompleteConfirmOpen(true)}
            disabled={endVisitMutation.isPending}
          >
            {endVisitMutation.isPending ? "Completing..." : "Complete Visit"}
          </Button>
        </div>
      </div>

      {/* Complete Visit Confirm */}
      <ConfirmDialog
        open={completeConfirmOpen}
        onOpenChange={setCompleteConfirmOpen}
        title="Complete Visit?"
        description="This will close the active visit and save all recorded data."
        confirmLabel="Complete Visit"
        onConfirm={handleEndVisit}
      />
    </div>
  );
}
