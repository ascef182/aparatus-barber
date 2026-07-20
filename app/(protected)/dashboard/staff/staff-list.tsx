"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";
import { toast } from "sonner";
import { CalendarOff, Clock, Pencil, Power } from "lucide-react";
import { updateStaff } from "@/app/_actions/manage-operations";
import { Avatar, AvatarFallback } from "@/app/_components/ui/avatar";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/app/_components/ui/alert-dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/app/_components/ui/sheet";
import { cn } from "@/lib/utils";
import { StaffForm } from "./staff-form";
import { WorkingHoursForm } from "./working-hours-form";
import { AbsenceForm } from "./absence-form";
import { LocationForm } from "./location-form";

type CompensationType = "MONTHLY" | "HOURLY" | "PER_SERVICE_COMMISSION";

type StaffItem = {
  id: string;
  displayName: string;
  jobTitle: string | null;
  color: string | null;
  isActive: boolean;
  locationId: string;
  locationName: string;
  compensationType: CompensationType | null;
  compensationAmountInCents: number | null;
  commissionBps: number | null;
  serviceIds: string[];
  serviceNames: string[];
  workingHours: { weekday: number; startTime: string; endTime: string }[];
  upcomingAbsenceStart: string | null;
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

function DeactivateButton({ id, isActive }: { id: string; isActive: boolean }) {
  const t = useTranslations("dashboard.staff");
  const action = useAction(updateStaff, {
    onSuccess: () => toast.success(isActive ? t("deactivated") : t("reactivated")),
    onError: ({ error }) => toast.error(error.serverError ?? t("updateError")),
  });
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" disabled={action.isPending} aria-label={isActive ? t("deactivate") : t("reactivate")}>
          <Power className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{isActive ? t("deactivateConfirmTitle") : t("reactivateConfirmTitle")}</AlertDialogTitle>
          <AlertDialogDescription>{isActive ? t("deactivateConfirmBody") : t("reactivateConfirmBody")}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction onClick={() => action.execute({ id, isActive: !isActive })}>
            {isActive ? t("deactivate") : t("reactivate")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function StaffList({
  staff,
  locations,
  services,
}: {
  staff: StaffItem[];
  locations: { id: string; name: string }[];
  services: { id: string; name: string }[];
}) {
  const t = useTranslations("dashboard.staff");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (locations.length === 0) {
    return (
      <div className="max-w-xl rounded-xl border bg-card p-5">
        <h2 className="text-lg font-semibold">{t("locationRequiredTitle")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t("locationRequiredBody")}</p>
        <div className="mt-5">
          <LocationForm />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button onClick={() => setCreating(true)}>{t("newProfessional")}</Button>
      </div>
      <Sheet open={creating} onOpenChange={setCreating}>
        <SheetContent className="w-full overflow-y-auto p-6 sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{t("newProfessional")}</SheetTitle>
            <SheetDescription>{t("newProfessionalDescription")}</SheetDescription>
          </SheetHeader>
          <div className="pt-4">
            <StaffForm locations={locations} services={services} onDone={() => setCreating(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div className="grid gap-3 md:grid-cols-2">
        {staff.map((member) => (
          <article key={member.id} className={cn("rounded-xl border bg-card p-5 shadow-sm", !member.isActive && "opacity-60")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="relative shrink-0">
                  <Avatar className="size-10">
                    <AvatarFallback className="bg-muted text-sm font-medium">{initialsOf(member.displayName)}</AvatarFallback>
                  </Avatar>
                  <span
                    className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-card"
                    style={{ backgroundColor: member.color ?? "var(--muted-foreground)" }}
                  />
                </div>
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">{member.displayName}</h2>
                  <p className="truncate text-sm text-muted-foreground">{member.jobTitle || member.locationName}</p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!member.isActive && <Badge variant="outline">{t("inactive")}</Badge>}
                <Button variant="ghost" size="icon-sm" aria-label={t("editProfessional")} onClick={() => setEditingId(member.id)}>
                  <Pencil className="size-4" />
                </Button>
                <DeactivateButton id={member.id} isActive={member.isActive} />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {member.serviceNames.length ? (
                member.serviceNames.map((name) => (
                  <Badge key={name} variant="secondary">
                    {name}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">{t("noServicesAssociated")}</span>
              )}
            </div>

            {member.upcomingAbsenceStart && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400">
                <CalendarOff className="size-3.5" />
                {t("unavailableFrom", { date: member.upcomingAbsenceStart })}
              </p>
            )}

            <div className="mt-4 flex gap-2 border-t pt-3">
              <Button variant="ghost" size="sm" onClick={() => setExpanded(expanded === `${member.id}-hours` ? null : `${member.id}-hours`)}>
                <Clock className="size-4" />
                {t("schedule")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(expanded === `${member.id}-absence` ? null : `${member.id}-absence`)}
              >
                <CalendarOff className="size-4" />
                {t("registerAbsenceLink")}
              </Button>
            </div>
            {expanded === `${member.id}-hours` && (
              <div className="mt-3 border-t pt-3">
                <WorkingHoursForm staffId={member.id} initialHours={member.workingHours} onDone={() => setExpanded(null)} />
              </div>
            )}
            {expanded === `${member.id}-absence` && (
              <div className="mt-3 border-t pt-3">
                <AbsenceForm staffId={member.id} onDone={() => setExpanded(null)} />
              </div>
            )}

            <Sheet open={editingId === member.id} onOpenChange={(open) => setEditingId(open ? member.id : null)}>
              <SheetContent className="w-full overflow-y-auto p-6 sm:max-w-xl">
                <SheetHeader>
                  <SheetTitle>{t("editProfessional")}</SheetTitle>
                  <SheetDescription>{t("editProfessionalDescription")}</SheetDescription>
                </SheetHeader>
                <div className="pt-4">
                  <StaffForm
                    staff={{
                      id: member.id,
                      displayName: member.displayName,
                      jobTitle: member.jobTitle,
                      locationId: member.locationId,
                      compensationType: member.compensationType,
                      compensationAmountInCents: member.compensationAmountInCents,
                      commissionBps: member.commissionBps,
                      serviceIds: member.serviceIds,
                    }}
                    locations={locations}
                    services={services}
                    onDone={() => setEditingId(null)}
                  />
                </div>
              </SheetContent>
            </Sheet>
          </article>
        ))}
        {staff.length === 0 && <p className="text-muted-foreground">{t("noStaff")}</p>}
      </div>
    </div>
  );
}
