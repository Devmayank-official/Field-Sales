import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertClientSchema, type InsertClient, ClientStatusEnum } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColorLabelPicker } from "@/components/ui/color-label-picker";
import { useCreateClient, useUpdateClient, useClients } from "@/hooks/useClients";
import { useToast } from "@/hooks/use-toast";
import { ContactRound, AlertTriangle } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { ColorLabel } from "@/lib/schema";
import { haptic } from "@/lib/haptic";

interface ClientFormProps {
  initialData?: InsertClient & { id: string };
  onSuccess: () => void;
}

export function ClientForm({ initialData, onSuccess }: ClientFormProps) {
  const { toast } = useToast();
  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const isPending = createMutation.isPending || updateMutation.isPending;
  const { data: allClients } = useClients();

  const [dupWarning, setDupWarning] = useState<string | null>(null);
  const [colorLabel, setColorLabel] = useState<ColorLabel | undefined>(
    initialData?.colorLabel as ColorLabel | undefined
  );
  const dupCheckTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const form = useForm<InsertClient>({
    resolver: zodResolver(insertClientSchema),
    defaultValues: initialData
      ? {
          ...initialData,
          tags: (Array.isArray(initialData.tags) ? initialData.tags.join(", ") : initialData.tags ?? "") as any,
        }
      : {
          name: "",
          phone: "",
          email: "",
          address: "",
          subAddress: "",
          pincode: "",
          shopType: "",
          status: "Lead",
          tags: "" as any,
          notes: "",
          visitFrequency: undefined,
          monthlyValueEstimate: undefined,
        },
  });

  const checkDuplicates = (name: string, phone: string) => {
    clearTimeout(dupCheckTimer.current);
    dupCheckTimer.current = setTimeout(() => {
      if (!allClients) return;
      const others = allClients.filter((c) => !initialData || c.id !== initialData.id);
      const nameDup = name.trim().length > 1 &&
        others.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
      const phoneDup = phone.trim().length > 4 &&
        others.find((c) => c.phone && c.phone.replace(/\D/g, "") === phone.replace(/\D/g, ""));
      if (nameDup) setDupWarning(`A client named "${nameDup.name}" already exists.`);
      else if (phoneDup) setDupWarning(`Phone already used by "${phoneDup.name}".`);
      else setDupWarning(null);
    }, 400);
  };

  useEffect(() => () => clearTimeout(dupCheckTimer.current), []);

  const handleContactImport = async () => {
    try {
      if (!("contacts" in navigator)) {
        toast({ title: "Contact picker not supported on this device", variant: "destructive" });
        return;
      }
      const contacts = await (navigator as any).contacts.select(
        ["name", "tel", "email", "address"],
        { multiple: false }
      );
      if (!contacts || contacts.length === 0) return;
      const c = contacts[0];
      if (c.name?.[0]) form.setValue("name", c.name[0]);
      if (c.tel?.[0]) form.setValue("phone", c.tel[0]);
      if (c.email?.[0]) form.setValue("email", c.email[0]);
      toast({ title: "Contact imported" });
    } catch {
      toast({ title: "Could not access contacts", variant: "destructive" });
    }
  };

  const onSubmit = (data: InsertClient) => {
    const payload = { ...data, colorLabel };
    if (initialData) {
      updateMutation.mutate(
        { id: initialData.id, data: payload },
        {
          onSuccess: () => {
            haptic.success();
            toast({ title: "Client updated" });
            onSuccess();
          },
        }
      );
    } else {
      createMutation.mutate(payload, {
        onSuccess: () => {
          haptic.success();
          toast({ title: "Client created" });
          onSuccess();
        },
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Contact import */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full gap-2 rounded-xl border-dashed"
          onClick={handleContactImport}
        >
          <ContactRound className="w-4 h-4" />
          Import from Contacts
        </Button>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Business Name *</FormLabel>
              <FormControl>
                <Input
                  placeholder="Sunrise Supermarket"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    checkDuplicates(e.target.value, form.getValues("phone") ?? "");
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {dupWarning && (
          <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{dupWarning}</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ClientStatusEnum.options.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="shopType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Shop Type *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Convenience" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Color Label */}
        <div className="space-y-2">
          <Label>Color Label</Label>
          <ColorLabelPicker value={colorLabel} onChange={setColorLabel} />
        </div>

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Main Address *</FormLabel>
              <FormControl>
                <Input placeholder="123 Main St" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="subAddress"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sub-Address / Landmark</FormLabel>
                <FormControl>
                  <Input placeholder="Near the park" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="pincode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Postal Code</FormLabel>
                <FormControl>
                  <Input placeholder="ZIP / PIN" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="+1..."
                    {...field}
                    onChange={(e) => {
                      field.onChange(e);
                      checkDuplicates(form.getValues("name") ?? "", e.target.value);
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="store@email.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="visitFrequency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Visit Every (days)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g. 7"
                    min={1}
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="monthlyValueEstimate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monthly Value ($)</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g. 1500"
                    min={0}
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tags (comma separated)</FormLabel>
              <FormControl>
                <Input placeholder="Priority, Wholesale, New" {...field} />
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
                  placeholder="Any additional context about this client..."
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
            className="w-full h-12 text-base rounded-xl shadow-lg shadow-primary/20"
            disabled={isPending}
          >
            {isPending ? "Saving..." : initialData ? "Save Changes" : "Create Client"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
