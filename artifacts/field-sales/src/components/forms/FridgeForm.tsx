import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertFridgeSchema, type InsertFridge, FridgeConditionEnum } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QrScanner } from "@/components/ui/qr-scanner";
import { useCreateFridge, useUpdateFridge } from "@/hooks/useFridges";
import { useToast } from "@/hooks/use-toast";
import { ScanLine } from "lucide-react";
import { useState } from "react";

interface FridgeFormProps {
  clientId: string;
  initialData?: InsertFridge & { id: string };
  onSuccess: () => void;
}

export function FridgeForm({ clientId, initialData, onSuccess }: FridgeFormProps) {
  const { toast } = useToast();
  const createMutation = useCreateFridge();
  const updateMutation = useUpdateFridge();
  const isPending = createMutation.isPending || updateMutation.isPending;
  const [qrScannerOpen, setQrScannerOpen] = useState(false);

  const form = useForm<InsertFridge>({
    resolver: zodResolver(insertFridgeSchema),
    defaultValues: initialData ?? {
      clientId,
      serialNo: "",
      gccCode: "",
      qrCodeValue: "",
      condition: "Good",
      notes: "",
    },
  });

  const onSubmit = (data: InsertFridge) => {
    const payload = { ...data, clientId };
    if (initialData) {
      updateMutation.mutate(
        { id: initialData.id, data: payload },
        {
          onSuccess: () => {
            toast({ title: "Asset updated" });
            onSuccess();
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          toast({ title: "Asset added successfully" });
          onSuccess();
        },
      });
    }
  };

  const handleQrScan = (value: string) => {
    form.setValue("qrCodeValue", value);
    toast({ title: "QR Code scanned", description: value.slice(0, 40) });
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="serialNo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Serial Number *</FormLabel>
                <FormControl>
                  <Input placeholder="CC-FR-0000" {...field} className="font-mono" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="gccCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GCC Code</FormLabel>
                  <FormControl>
                    <Input placeholder="GCC-A000" {...field} className="font-mono" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="condition"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {FridgeConditionEnum.options.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="qrCodeValue"
            render={({ field }) => (
              <FormItem>
                <FormLabel>QR Code Value</FormLabel>
                <FormControl>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Scan or enter QR code..."
                      {...field}
                      className="font-mono text-sm flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setQrScannerOpen(true)}
                      title="Scan QR Code"
                      className="shrink-0"
                    >
                      <ScanLine className="w-4 h-4" />
                    </Button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Any installation notes, issues, or observations..."
                    className="resize-none"
                    rows={3}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="pt-4">
            <Button
              type="submit"
              className="w-full h-12 text-lg rounded-xl shadow-lg shadow-primary/20"
              disabled={isPending}
            >
              {isPending ? "Saving..." : initialData ? "Save Changes" : "Add Asset"}
            </Button>
          </div>
        </form>
      </Form>

      <QrScanner
        open={qrScannerOpen}
        onOpenChange={setQrScannerOpen}
        onScan={handleQrScan}
      />
    </>
  );
}
