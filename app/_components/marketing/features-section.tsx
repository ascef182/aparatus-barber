import { getTranslations } from "next-intl/server";
import { Reveal } from "./reveal";
import {
  MiniBookingCard,
  RoleBadge,
  SlotChips,
  StaffAvatarInitial,
} from "./product-mockup-primitives";

const BOOKING_SLOTS = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];

// 3 blocos de benefício (não funcionalidade) — cada um com uma demonstração
// visual fiel, não um ícone genérico repetido 6x.
const BLOCK_KEYS = ["agenda", "booking", "management"] as const;

export async function FeaturesSection() {
  const t = await getTranslations("landing.features");
  const tMockup = await getTranslations("landing.mockup");
  const tRoles = await getTranslations("roles");

  const service = tMockup("servicePlaceholder");
  const customer = tMockup("customerPlaceholder");

  return (
    <section id="features" className="bg-background px-6 py-24">
      <div className="mx-auto max-w-6xl">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-foreground text-3xl font-semibold tracking-tight md:text-4xl">
            {t("title")}
          </h2>
          <p className="text-muted-foreground mt-4">{t("subtitle")}</p>
        </Reveal>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {BLOCK_KEYS.map((key, i) => (
            <Reveal key={key} delay={i * 0.1}>
              <div className="border-border bg-card hover:border-primary/30 flex h-full flex-col gap-6 rounded-xl border p-6 transition-[transform,border-color,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-md">
                <div>
                  <h3 className="text-foreground font-semibold">
                    {t(`${key}Title`)}
                  </h3>
                  <p className="text-muted-foreground mt-2 text-sm">
                    {t(`${key}Body`)}
                  </p>
                </div>

                {key === "agenda" && (
                  <div className="mt-auto flex flex-col gap-2" aria-hidden>
                    <MiniBookingCard
                      time="09:00"
                      status="CONFIRMED"
                      service={service}
                      customer={customer}
                      staff="Ana"
                    />
                    <MiniBookingCard
                      time="10:30"
                      status="PENDING"
                      service={service}
                      customer={customer}
                      staff="Bruno"
                    />
                  </div>
                )}

                {key === "booking" && (
                  <div className="mt-auto">
                    <SlotChips slots={BOOKING_SLOTS} selectedIndex={3} />
                  </div>
                )}

                {key === "management" && (
                  <div className="mt-auto flex flex-col gap-2" aria-hidden>
                    {[
                      { name: "Ana Souza", role: tRoles("manager") },
                      { name: "Bruno Lima", role: tRoles("professional") },
                    ].map((person) => (
                      <div
                        key={person.name}
                        className="bg-muted/60 flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs"
                      >
                        <StaffAvatarInitial
                          name={person.name}
                          className="size-7"
                        />
                        <span className="text-foreground min-w-0 flex-1 truncate font-medium">
                          {person.name}
                        </span>
                        <RoleBadge label={person.role} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
