import { Avatar, AvatarFallback } from "@/app/_components/ui/avatar";
import { Badge } from "@/app/_components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Peças compartilhadas pra montar mockups fiéis à UI real do produto (agenda,
 * disponibilidade, equipe) em vez de ilustração abstrata — usadas tanto no
 * hero (scroll-preview-hero.tsx) quanto na seção de gestão/equipe
 * (mobile-showcase-section.tsx). Cada peça espelha a estrutura de um
 * componente real do dashboard, citado no comentário de cada uma, pra ficar
 * fácil notar se a UI real mudar e o mockup ficar desatualizado.
 */

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

/** Espelha o <article> de reserva em app/(protected)/dashboard/agenda.tsx. */
export function MiniBookingCard({
  time,
  status,
  service,
  customer,
  staff,
  className,
}: {
  time: string;
  status: string;
  service: string;
  customer: string;
  staff: string;
  className?: string;
}) {
  return (
    <article className={cn("bg-muted/60 rounded-lg p-2.5 text-xs", className)}>
      <div className="flex items-start justify-between gap-2">
        <b className="text-foreground">{time}</b>
        <span className="bg-background text-muted-foreground rounded px-1.5 py-0.5 text-[10px]">
          {status}
        </span>
      </div>
      <p className="text-foreground mt-1 font-medium">{service}</p>
      <p className="text-muted-foreground mt-0.5">
        {customer} · {staff}
      </p>
    </article>
  );
}

/** Espelha a linha de dia em app/(protected)/dashboard/staff/working-hours-form.tsx. */
export function WeekdayAvailabilityRow({
  label,
  enabled,
  start,
  end,
}: {
  label: string;
  enabled: boolean;
  start?: string;
  end?: string;
}) {
  return (
    <div className="bg-muted/60 flex items-center justify-between gap-3 rounded-md px-2.5 py-1.5 text-xs">
      <span
        className={cn(
          "font-medium",
          enabled ? "text-foreground" : "text-muted-foreground/60",
        )}
      >
        {label}
      </span>
      {enabled ? (
        <span className="text-muted-foreground tabular-nums">
          {start}–{end}
        </span>
      ) : (
        <span className="text-muted-foreground/60">—</span>
      )}
    </div>
  );
}

/** Espelha a etiqueta de papel usada junto às linhas de membro em app/(protected)/dashboard/settings/team-member-row.tsx. */
export function RoleBadge({ label }: { label: string }) {
  return (
    <Badge variant="secondary" className="text-[10px]">
      {label}
    </Badge>
  );
}

/** Espelha o avatar com iniciais (initialsOf) de team-member-row.tsx. */
export function StaffAvatarInitial({
  name,
  className,
}: {
  name: string;
  className?: string;
}) {
  return (
    <Avatar className={className}>
      <AvatarFallback className="text-[10px] font-medium">
        {initialsOf(name)}
      </AvatarFallback>
    </Avatar>
  );
}

/** Espelha a lista de horários disponíveis (variant default/outline) de app/t/[slug]/service-item.tsx — aqui sempre ilustrativo/não interativo, por isso aria-hidden no container. */
export function SlotChips({
  slots,
  selectedIndex = slots.length - 1,
}: {
  slots: string[];
  selectedIndex?: number;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5" aria-hidden>
      {slots.map((slot, i) => (
        <span
          key={slot}
          className={cn(
            "flex items-center justify-center rounded-md py-1.5 text-[11px] font-medium tabular-nums",
            i === selectedIndex
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {slot}
        </span>
      ))}
    </div>
  );
}
