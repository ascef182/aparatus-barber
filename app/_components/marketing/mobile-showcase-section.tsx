import { getTranslations } from "next-intl/server";
import { Reveal } from "./reveal";
import {
  MiniBookingCard,
  RoleBadge,
  StaffAvatarInitial,
} from "./product-mockup-primitives";

/**
 * Mostra o app rodando em desktop + mobile ao mesmo tempo — reforço visual
 * antes do Final CTA. Fiel à UI real: a janela de desktop é uma fatia
 * condensada da agenda (ver app/(protected)/dashboard/agenda.tsx) e o
 * mockup mobile é um roster de equipe (ver .../settings/team-member-row.tsx)
 * — nada de tiles decorativos ou métricas inventadas.
 */

const DESKTOP_BOOKINGS = [
  [
    { time: "09:00", status: "CONFIRMED", staff: "Ana" },
    { time: "11:00", status: "PENDING", staff: "Bruno" },
  ],
  [
    { time: "14:30", status: "CONFIRMED", staff: "Carla" },
    { time: "16:00", status: "COMPLETED", staff: "Ana" },
  ],
] as const;

const TEAM_ROSTER = [
  { name: "Ana Souza", roleKey: "manager" as const },
  { name: "Bruno Lima", roleKey: "professional" as const },
  { name: "Carla Dias", roleKey: "professional" as const },
  { name: "Diego Alves", roleKey: "receptionist" as const },
];

export async function MobileShowcaseSection() {
  const t = await getTranslations("landing.mobileShowcase");
  const tMockup = await getTranslations("landing.mockup");
  const tRoles = await getTranslations("roles");

  const service = tMockup("servicePlaceholder");
  const customer = tMockup("customerPlaceholder");

  return (
    <section className="bg-background relative overflow-hidden px-6 py-24">
      <div className="mx-auto flex max-w-6xl flex-col-reverse items-center gap-16 lg:flex-row lg:items-center lg:justify-between">
        <Reveal className="max-w-md space-y-4 text-center lg:text-left">
          <h2 className="text-foreground text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {t("title")}
          </h2>
          <p className="text-muted-foreground text-lg">{t("subtitle")}</p>
        </Reveal>

        <Reveal
          delay={0.15}
          className="relative mx-auto mt-8 w-full max-w-md lg:mt-0 lg:mr-12"
        >
          {/* janela de desktop — fatia condensada da agenda real */}
          <div className="border-border bg-card shadow-foreground/10 relative rotate-2 overflow-hidden rounded-2xl border shadow-2xl transition-transform duration-300 hover:rotate-1 max-sm:hidden">
            <div className="border-border bg-muted/50 border-b px-6 py-4">
              <div className="flex items-center gap-2" aria-hidden>
                <div className="bg-destructive/50 size-3 rounded-full" />
                <div className="bg-accent/60 size-3 rounded-full" />
                <div className="bg-success/60 size-3 rounded-full" />
              </div>
            </div>

            <div className="bg-background min-h-[320px] p-6">
              <div className="mb-5 flex items-center gap-3">
                <div className="bg-primary text-primary-foreground flex size-9 items-center justify-center rounded-xl text-sm font-bold">
                  B
                </div>
                <span className="text-foreground text-sm font-semibold">
                  {t("agendaLabel")}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3" aria-hidden>
                {DESKTOP_BOOKINGS.map((column, colIndex) => (
                  <div key={colIndex} className="flex flex-col gap-2">
                    {column.map((booking) => (
                      <MiniBookingCard
                        key={booking.time}
                        time={booking.time}
                        status={booking.status}
                        service={service}
                        customer={customer}
                        staff={booking.staff}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* mockup mobile — roster de equipe real */}
          <div className="absolute -right-6 -bottom-4 w-56 -rotate-12 rounded-[2.5rem] bg-secondary p-2 shadow-2xl transition-transform duration-300 hover:-rotate-6 sm:-right-24 sm:h-[28rem] md:-right-12 md:-bottom-12 md:h-80 md:w-44">
            <div className="border-border bg-background h-full w-full overflow-hidden rounded-[2rem] border">
              <div className="border-border bg-muted/50 flex items-center justify-between border-b px-5 py-3 text-xs">
                <span className="text-foreground font-semibold">9:41</span>
                <div className="bg-success h-2 w-4 rounded-sm" aria-hidden />
              </div>

              <div className="flex flex-col gap-2 p-3">
                <p className="text-muted-foreground px-1 text-[11px] font-medium">
                  {t("teamLabel")}
                </p>
                <div className="flex flex-col gap-2" aria-hidden>
                  {TEAM_ROSTER.map((person) => (
                    <div
                      key={person.name}
                      className="bg-muted/60 flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px]"
                    >
                      <StaffAvatarInitial
                        name={person.name}
                        className="size-6"
                      />
                      <span className="text-foreground min-w-0 flex-1 truncate font-medium">
                        {person.name.split(" ")[0]}
                      </span>
                      <RoleBadge label={tRoles(person.roleKey)} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
