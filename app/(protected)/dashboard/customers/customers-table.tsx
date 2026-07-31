"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Download, Pencil } from "lucide-react";
import { updateCustomer } from "@/app/_actions/manage-operations";
import { Avatar, AvatarFallback } from "@/app/_components/ui/avatar";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/app/_components/ui/sheet";
import { Switch } from "@/app/_components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/_components/ui/table";
import { Textarea } from "@/app/_components/ui/textarea";

export type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  isBlocked: boolean;
  tags: string[];
  totalSpentInCents: number;
  lastVisitAt: string | null;
  nextAppointmentAt: string | null;
};

function initialsOf(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

function money(cents: number, locale: string, currency: string) {
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}

function exportCsv(customers: CustomerRow[], locale: string, labels: { blocked: string; active: string }) {
  const header = ["Nome", "Telefone", "E-mail", "Última visita", "Total gasto (cents)", "Próximo horário", "Tags", "Status"];
  const rows = customers.map((c) => [
    c.name,
    c.phone ?? "",
    c.email ?? "",
    c.lastVisitAt ? new Intl.DateTimeFormat(locale).format(new Date(c.lastVisitAt)) : "",
    String(c.totalSpentInCents),
    c.nextAppointmentAt ? new Intl.DateTimeFormat(locale, { dateStyle: "short", timeStyle: "short" }).format(new Date(c.nextAppointmentAt)) : "",
    c.tags.join("; "),
    c.isBlocked ? labels.blocked : labels.active,
  ]);
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `clientes-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function EditCustomerSheet({
  customer,
  open,
  onOpenChange,
}: {
  customer: CustomerRow;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("dashboard.customers");
  const [notes, setNotes] = useState(customer.notes ?? "");
  const [isBlocked, setIsBlocked] = useState(customer.isBlocked);
  const [tagsInput, setTagsInput] = useState(customer.tags.join(", "));
  const action = useAction(updateCustomer, {
    onSuccess: () => {
      toast.success(t("updated"));
      onOpenChange(false);
    },
    onError: ({ error }) => toast.error(error.serverError ?? t("updateError")),
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const tags = tagsInput.split(",").map((tag) => tag.trim()).filter(Boolean).slice(0, 10);
    action.execute({ id: customer.id, notes: notes || null, isBlocked, tags });
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto p-6 sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("editTitle")}</SheetTitle>
          <SheetDescription>{t("editDescription")}</SheetDescription>
        </SheetHeader>
        <form className="grid gap-4 pt-4" onSubmit={submit}>
          <div className="grid gap-1.5">
            <Label htmlFor={`notes-${customer.id}`}>{t("notesPlaceholder")}</Label>
            <Textarea id={`notes-${customer.id}`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("notesPlaceholder")} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor={`tags-${customer.id}`}>{t("tagsLabel")}</Label>
            <Input id={`tags-${customer.id}`} value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} placeholder={t("tagsPlaceholder")} />
            <p className="text-xs text-muted-foreground">{t("tagsHint")}</p>
          </div>
          <div className="flex items-center gap-3">
            <Switch id={`blocked-${customer.id}`} checked={isBlocked} onCheckedChange={setIsBlocked} />
            <Label htmlFor={`blocked-${customer.id}`}>{t("blockCustomer")}</Label>
          </div>
          <Button type="submit" disabled={action.isPending} className="w-fit">
            {action.isPending ? "..." : t("save")}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export function CustomersTable({ customers, locale, currency }: { customers: CustomerRow[]; locale: string; currency: string }) {
  const t = useTranslations("dashboard.customers");
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingCustomer = customers.find((c) => c.id === editingId) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportCsv(customers, locale, { blocked: t("blocked"), active: t("active") })}
        >
          <Download className="size-4" />
          {t("export")}
        </Button>
      </div>

      <div className="overflow-hidden rounded-card border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("colCustomer")}</TableHead>
              <TableHead>{t("colPhone")}</TableHead>
              <TableHead>{t("colLastVisit")}</TableHead>
              <TableHead>{t("colTotalSpent")}</TableHead>
              <TableHead>{t("colNextAppointment")}</TableHead>
              <TableHead>{t("colTags")}</TableHead>
              <TableHead className="text-right">{t("edit")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => (
              <TableRow key={customer.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="size-8 shrink-0">
                      <AvatarFallback className="bg-muted text-xs font-medium">{initialsOf(customer.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="truncate font-medium">{customer.name}</p>
                      {customer.isBlocked && <Badge variant="destructive" className="mt-0.5">{t("blocked")}</Badge>}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{customer.phone ?? t("noPhone")}</TableCell>
                <TableCell className="text-muted-foreground">
                  {customer.lastVisitAt ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(customer.lastVisitAt)) : t("noVisitYet")}
                </TableCell>
                <TableCell className="font-medium">{money(customer.totalSpentInCents, locale, currency)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {customer.nextAppointmentAt
                    ? new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(customer.nextAppointmentAt))
                    : t("noUpcoming")}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {customer.tags.map((tag) => (
                      <Badge key={tag} variant="secondary">{tag}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon-sm" aria-label={t("edit")} onClick={() => setEditingId(customer.id)}>
                    <Pencil className="size-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {editingCustomer && (
        <EditCustomerSheet
          customer={editingCustomer}
          open={editingId !== null}
          onOpenChange={(open) => setEditingId(open ? editingCustomer.id : null)}
        />
      )}
    </div>
  );
}
