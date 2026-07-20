"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Pencil, Scissors } from "lucide-react";
import { updateService } from "@/app/_actions/manage-operations";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/_components/ui/avatar";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import { Switch } from "@/app/_components/ui/switch";
import { ServiceForm } from "./service-form";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/app/_components/ui/sheet";
import { cn } from "@/lib/utils";

type ServiceItem = {
  id: string;
  name: string;
  imageUrl: string | null;
  durationMinutes: number;
  priceInCents: number;
  currency: string;
  isActive: boolean;
  paymentMode: "ON_SITE" | "DEPOSIT" | "FULL_PREPAYMENT" | null;
  depositPercent: number | null;
  images: { url: string; publicId?: string }[];
  staffNames: string[];
};

function ActiveToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const t = useTranslations("dashboard.services");
  const action = useAction(updateService, {
    onSuccess: () => toast.success(isActive ? t("archived") : t("reactivated")),
    onError: ({ error }) => toast.error(error.serverError ?? t("genericError")),
  });
  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={isActive}
        disabled={action.isPending}
        onCheckedChange={() => action.execute({ id, isActive: !isActive })}
        aria-label={isActive ? t("archive") : t("reactivate")}
      />
      <Badge variant={isActive ? "secondary" : "outline"}>{isActive ? t("active") : t("inactive")}</Badge>
    </div>
  );
}

export function ServicesList({ services, locale }: { services: ServiceItem[]; locale: string }) {
  const t = useTranslations("dashboard.services");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button onClick={() => setCreating(true)}>{t("newService")}</Button>
      </div>
      <Sheet open={creating} onOpenChange={setCreating}>
        <SheetContent className="w-full overflow-y-auto p-6 sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{t("newService")}</SheetTitle>
            <SheetDescription>{t("newServiceDescription")}</SheetDescription>
          </SheetHeader>
          <div className="pt-4">
            <ServiceForm onDone={() => setCreating(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="grid gap-3 md:grid-cols-2">
        {services.map((service) => (
          <article key={service.id} className={cn("rounded-xl border bg-card p-5 shadow-sm", !service.isActive && "opacity-60")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar className="size-10 rounded-md">
                  {service.imageUrl && <AvatarImage src={service.imageUrl} alt="" className="object-cover" />}
                  <AvatarFallback className="rounded-md bg-muted">
                    <Scissors className="size-4 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">{service.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {service.durationMinutes} min ·{" "}
                    {new Intl.NumberFormat(locale, { style: "currency", currency: service.currency }).format(service.priceInCents / 100)}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label={t("edit")} onClick={() => setEditingId(service.id)}>
                <Pencil className="size-4" />
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {service.staffNames.length ? (
                service.staffNames.map((name) => (
                  <Badge key={name} variant="secondary">
                    {name}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">{t("noStaffAssigned")}</span>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between border-t pt-3">
              <ActiveToggle id={service.id} isActive={service.isActive} />
            </div>

            <Sheet open={editingId === service.id} onOpenChange={(open) => setEditingId(open ? service.id : null)}>
              <SheetContent className="w-full overflow-y-auto p-6 sm:max-w-xl">
                <SheetHeader>
                  <SheetTitle>{t("edit")}</SheetTitle>
                  <SheetDescription>{t("editDescription")}</SheetDescription>
                </SheetHeader>
                <div className="pt-4">
                  <ServiceForm
                    service={{
                      id: service.id,
                      name: service.name,
                      durationMinutes: service.durationMinutes,
                      priceInCents: service.priceInCents,
                      paymentMode: service.paymentMode ?? "ON_SITE",
                      depositPercent: service.depositPercent ?? undefined,
                      images: service.images,
                    }}
                    onDone={() => setEditingId(null)}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </article>
        ))}
        {services.length === 0 && <p className="text-muted-foreground">{t("noServices")}</p>}
      </div>
    </div>
  );
}
