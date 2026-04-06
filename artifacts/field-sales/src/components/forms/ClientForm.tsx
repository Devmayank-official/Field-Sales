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
import { ContactRound, AlertTriangle, Search, User } from "lucide-react";
import { useState, useEffect, useRef, useMemo } from "react";
import type { ColorLabel } from "@/lib/schema";
import { haptic } from "@/lib/native/haptics";
import { Capacitor } from "@capacitor/core";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ContactItem {
  id: string;
  displayName: string;
  phone: string;
  email: string;
}

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

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerContacts, setPickerContacts] = useState<ContactItem[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

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

  const filteredContacts = useMemo(() => {
    const q = pickerSearch.toLowerCase().trim();
    if (!q) return pickerContacts;
    return pickerContacts.filter(
      (c) =>
        c.displayName.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        c.email.toLowerCase().includes(q)
    );
  }, [pickerContacts, pickerSearch]);

  const applyContact = (c: ContactItem) => {
    if (c.displayName) form.setValue("name", c.displayName);
    if (c.phone) form.setValue("phone", c.phone);
    if (c.email) form.setValue("email", c.email);
    setPickerOpen(false);
    setPickerSearch("");
    haptic.light();
    toast({ title: "Contact imported" });
  };

  const handleContactImport = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        const { Contacts } = await import("@capacitor-community/contacts");
        const permission = await Contacts.requestPermissions();
        if (permission.contacts !== "granted") {
          toast({ title: "Contacts permission denied", variant: "destructive" });
          return;
        }
        setPickerLoading(true);
        setPickerOpen(true);
        const result = await Contacts.getContacts({
          projection: { name: true, phones: true, emails: true },
        });
        const mapped: ContactItem[] = (result.contacts ?? [])
          .filter((c) => c.name?.display || c.name?.given)
          .map((c, i) => ({
            id: c.contactId ?? String(i),
            displayName: c.name?.display ?? [c.name?.given, c.name?.family].filter(Boolean).join(" "),
            phone: c.phones?.[0]?.number ?? "",
            email: c.emails?.[0]?.address ?? "",
          }))
          .sort((a, b) => a.displayName.localeCompare(b.displayName));
        setPickerContacts(mapped);
        setPickerLoading(false);
      } else {
        if (!("contacts" in navigator)) {
          toast({ title: "Contact picker not supported on this browser", variant: "destructive" });
          return;
        }
        const contacts = await (navigator as any).contacts.select(
          ["name", "tel", "email"],
          { multiple: false }
        );
        if (!contacts || contacts.length === 0) return;
        const c = contacts[0];
        if (c.name?.[0]) form.setValue("name", c.name[0]);
        if (c.tel?.[0]) form.setValue("phone", c.tel[0]);
        if (c.email?.[0]) form.setValue("email", c.email[0]);
        toast({ title: "Contact imported" });
      }
    } catch {
      setPickerLoading(false);
      setPickerOpen(false);
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
    <>
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

      {/* Native Contact Picker Sheet */}
      <Sheet open={pickerOpen} onOpenChange={(v) => { setPickerOpen(v); if (!v) setPickerSearch(""); }}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-2xl flex flex-col p-0">
          <SheetHeader className="px-6 pt-6 pb-4 shrink-0">
            <SheetTitle>Choose a Contact</SheetTitle>
            <SheetDescription>Select a contact to pre-fill the form.</SheetDescription>
          </SheetHeader>

          <div className="px-6 pb-3 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone or email…"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                className="pl-9"
                autoFocus={false}
              />
            </div>
          </div>

          {pickerLoading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-7 h-7 border-[3px] border-primary/25 border-t-primary rounded-full animate-spin" />
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground pb-8">
              <User className="w-10 h-10 opacity-30" />
              <p className="text-sm">{pickerSearch ? "No contacts match your search" : "No contacts found"}</p>
            </div>
          ) : (
            <ScrollArea className="flex-1 px-2">
              <div className="flex flex-col gap-0.5 pb-8">
                {filteredContacts.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => applyContact(c)}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-muted/60 active:bg-muted transition-colors text-left w-full"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-semibold text-primary">
                        {c.displayName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{c.displayName}</p>
                      {(c.phone || c.email) && (
                        <p className="text-xs text-muted-foreground truncate">
                          {c.phone || c.email}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
