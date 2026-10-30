"use client";

import * as React from "react";
import Image from "next/image";
import {
  Battery,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  Signal,
  Users,
  Wifi,
} from "lucide-react";
import { useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { cn } from "@/lib/utils";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";
import {
  RoleBadge,
  StaffAvatarInitial,
  WeekdayAvailabilityRow,
} from "./product-mockup-primitives";

/** Nomes ilustrativos fixos — não são dados reais de cliente, só preenchem
 * o mockup da aba "team" com algo que pareça uma equipe de verdade. */
const MOCK_STAFF_NAMES = ["Ana Souza", "Bruno Lima", "Carla Dias"];

/**
 * Hero com abas de texto que trocam um mockup de celular ao lado, dirigido
 * por scroll em telas md+ (a seção fica "grudada" por scrollLength de
 * altura, cada aba ocupa uma fatia igual do scroll). Em mobile ou com
 * prefers-reduced-motion, vira clique simples, sem pin.
 */

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? React.useLayoutEffect : React.useEffect;

export interface PreviewTab {
  id: string;
  label: string;
  title: string;
  subtitle: string;
  /** Screenshot real do app (public/...) — quando ausente, cai no mockup ilustrado. */
  screenshot?: string;
}

export interface TrustItem {
  icon: React.ReactNode;
  label: string;
}

export interface MockupLabels {
  servicePlaceholder: string;
  depositLabel: string;
  statusConfirmed: string;
}

export interface ScrollPreviewHeroProps {
  badge: string;
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  ctaPrimary: { label: string; href: string };
  ctaSecondary: { label: string; href: string };
  trustItems: TrustItem[];
  tabs: PreviewTab[];
  /** Nomes curtos dos dias (seg..sáb) no idioma ativo, pra aba "availability" — calculados com Intl no servidor, sem chave de tradução por dia. */
  weekdayLabels: string[];
  mockupLabels: MockupLabels;
  /** 3 papéis (ex.: gerente/profissional/recepcionista) pra aba "team". */
  teamRoles: string[];
  scrollLength?: string;
}

const TAB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  booking: Clock,
  availability: Calendar,
  payments: CreditCard,
  team: Users,
};

/**
 * Conteúdo por aba quando não há screenshot real — fiel à estrutura das
 * telas reais do produto (ver WeekdayAvailabilityRow/RoleBadge/
 * StaffAvatarInitial em product-mockup-primitives.tsx), não mais
 * barras e pílulas abstratas. "booking" nunca chega aqui na prática (sempre
 * tem screenshot via TAB_SCREENSHOTS em hero.tsx) — mantido como fallback
 * simples caso o screenshot seja removido no futuro.
 */
function TabScreen({
  id,
  weekdayLabels,
  mockupLabels,
  teamRoles,
}: {
  id: string;
  weekdayLabels: string[];
  mockupLabels: MockupLabels;
  teamRoles: string[];
}) {
  if (id === "availability") {
    return (
      <div className="flex flex-col gap-1.5" aria-hidden>
        {weekdayLabels.map((label, i) => (
          <WeekdayAvailabilityRow
            key={label}
            label={label}
            enabled={i < 5}
            start="09:00"
            end="18:00"
          />
        ))}
      </div>
    );
  }

  if (id === "payments") {
    return (
      <div className="flex flex-col gap-2" aria-hidden>
        <div className="bg-muted/60 flex items-center justify-between rounded-lg px-3 py-2.5 text-xs">
          <span className="text-foreground font-medium">
            {mockupLabels.servicePlaceholder}
          </span>
          <span className="text-muted-foreground tabular-nums">R$ 80</span>
        </div>
        <div className="bg-muted/60 flex items-center justify-between rounded-lg px-3 py-2.5 text-xs">
          <span className="text-muted-foreground flex items-center gap-1.5">
            <CreditCard className="size-3.5" aria-hidden />
            {mockupLabels.depositLabel}
          </span>
          <span className="text-foreground tabular-nums">R$ 20</span>
        </div>
        <div className="bg-primary/10 flex items-center justify-between rounded-lg px-3 py-2.5 text-xs">
          <span className="text-primary font-medium">
            {mockupLabels.statusConfirmed}
          </span>
          <CheckCircle2 className="text-primary size-4" aria-hidden />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {MOCK_STAFF_NAMES.map((name, i) => (
        <div
          key={name}
          className="bg-muted/60 flex items-center gap-2.5 rounded-lg px-3 py-2 text-xs"
        >
          <StaffAvatarInitial name={name} className="size-7" />
          <span className="text-foreground min-w-0 flex-1 truncate font-medium">
            {name}
          </span>
          <RoleBadge label={teamRoles[i] ?? teamRoles[0]!} />
        </div>
      ))}
    </div>
  );
}

function PhonePanel({
  id,
  title,
  subtitle,
  screenshot,
  weekdayLabels,
  mockupLabels,
  teamRoles,
}: {
  id: string;
  title: string;
  subtitle: string;
  screenshot?: string;
  weekdayLabels: string[];
  mockupLabels: MockupLabels;
  teamRoles: string[];
}) {
  const Icon = TAB_ICONS[id] ?? Clock;
  return (
    <div className="relative mx-auto w-full max-w-[280px] px-2">
      <div
        className="bg-primary/25 absolute inset-x-6 top-6 -z-10 h-40 rounded-full blur-3xl"
        aria-hidden
      />
      <div className="overflow-hidden rounded-[2.5rem] bg-secondary p-2 shadow-2xl ring-1 shadow-black/50 ring-white/10">
        <div
          className={cn(
            "flex aspect-[9/19.5] max-h-[540px] flex-col overflow-hidden rounded-[2rem] bg-black ring-1 ring-white/10",
            !screenshot && "px-5",
          )}
        >
          <div
            className={cn(
              "flex items-center justify-between pt-3 pb-1 text-xs text-white",
              screenshot && "px-5",
            )}
          >
            <span className="font-semibold">9:41</span>
            <div className="flex items-end gap-1">
              <Signal aria-hidden className="size-4" />
              <Wifi aria-hidden className="size-[18px]" />
              <Battery aria-hidden className="-mb-px size-5" />
            </div>
          </div>
          <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-white/15" />

          {screenshot ? (
            <div className="relative mt-3 flex-1 overflow-hidden">
              <Image
                src={screenshot}
                alt={title}
                fill
                sizes="300px"
                className="object-cover object-top"
              />
            </div>
          ) : (
            <div className="flex flex-1 flex-col justify-center gap-5">
              <div className="flex items-center gap-2">
                <div className="bg-primary/20 text-primary flex size-8 shrink-0 items-center justify-center rounded-lg">
                  <Icon aria-hidden className="size-4" />
                </div>
                <p className="min-w-0 flex-1 text-[15px] leading-snug font-semibold tracking-tight break-words text-white">
                  {title}
                </p>
              </div>

              <TabScreen
                id={id}
                weekdayLabels={weekdayLabels}
                mockupLabels={mockupLabels}
                teamRoles={teamRoles}
              />

              <p className="text-xs leading-relaxed text-neutral-500">
                {subtitle}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PreviewStack({
  tabs,
  active,
  weekdayLabels,
  mockupLabels,
  teamRoles,
}: {
  tabs: PreviewTab[];
  active: number;
  weekdayLabels: string[];
  mockupLabels: MockupLabels;
  teamRoles: string[];
}) {
  return (
    <div className="relative w-full min-w-0">
      {tabs.map((t, i) => {
        const isActive = i === active;
        return (
          <div
            key={t.id}
            role="tabpanel"
            aria-hidden={!isActive}
            className={cn(
              "transition-opacity duration-500",
              isActive
                ? "relative opacity-100"
                : "pointer-events-none absolute inset-0 opacity-0",
            )}
          >
            <PhonePanel
              id={t.id}
              title={t.title}
              subtitle={t.subtitle}
              screenshot={t.screenshot}
              weekdayLabels={weekdayLabels}
              mockupLabels={mockupLabels}
              teamRoles={teamRoles}
            />
          </div>
        );
      })}
    </div>
  );
}

export function ScrollPreviewHero({
  badge,
  titleLine1,
  titleLine2,
  subtitle,
  ctaPrimary,
  ctaSecondary,
  trustItems,
  tabs,
  weekdayLabels,
  mockupLabels,
  teamRoles,
  scrollLength = "300vh",
}: ScrollPreviewHeroProps) {
  const prefersReducedMotion = useReducedMotion();
  const sectionRef = React.useRef<HTMLElement>(null);
  const [active, setActive] = React.useState(0);

  // Só roda pelo scroll em md+ com motion habilitado; em telas estreitas ou
  // com prefers-reduced-motion, as abas viram clique simples e a seção não
  // fica "grudada" (sem scroll-jacking).
  const [scrollDriven, setScrollDriven] = React.useState(false);
  useIsomorphicLayoutEffect(() => {
    if (prefersReducedMotion) {
      setScrollDriven(false);
      return;
    }
    const mq = window.matchMedia("(min-width: 768px)");
    const apply = () => setScrollDriven(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [prefersReducedMotion]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });
  useMotionValueEvent(scrollYProgress, "change", (p) => {
    if (!scrollDriven) return;
    const n = tabs.length;
    const i = Math.min(n - 1, Math.max(0, Math.floor(p * n - 1e-6)));
    setActive((prev) => (prev === i ? prev : i));
  });

  return (
    <section
      ref={sectionRef}
      aria-label="Hero"
      className="bg-background relative w-full md:motion-safe:h-[var(--hero-scroll-length)]"
      style={{ "--hero-scroll-length": scrollLength } as React.CSSProperties}
    >
      {/*
        Sem overflow-hidden aqui: um ancestral com overflow != visible quebra
        position: sticky nos descendentes (o contexto de rolagem deixa de ser
        o viewport), o que impedia o painel abaixo de "grudar" e deixava um
        vão vazio do tamanho do --hero-scroll-length até a próxima seção.

        Estrutural via media query (não estado React): assim o HTML já nasce
        certo no primeiro paint, sem pulo de layout depois da hidratação.
        top-16/h-[calc(100vh-4rem)] (não top-0/h-screen) para o hero ficar
        pinado LOGO ABAIXO do SiteNav (sticky top-0 z-50), nunca embaixo dele.
      */}
      <div className="flex flex-col justify-center md:motion-safe:sticky md:motion-safe:top-16 md:motion-safe:h-[calc(100vh-4rem)] md:motion-safe:overflow-hidden">
        <div
          className="absolute inset-x-0 top-0 -z-10 h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(230,57,70,0.14),transparent_65%)]"
          aria-hidden
        />
        <div className="mx-auto flex w-full max-w-7xl flex-col justify-center px-6 py-10 lg:py-14">
          <div className="flex flex-col-reverse justify-center gap-8 md:flex-row md:items-center md:gap-10 xl:gap-[72px]">
            {/* preview do celular — sem abas clicáveis, só o efeito de
                scroll troca o conteúdo (useMotionValueEvent acima).
                md:items-center (no pai) centraliza o celular com o bloco de
                texto em vez de tentar um offset manual pra alinhar topos —
                o celular é mais alto que o texto, então centralizar reparte
                a diferença em vez de deixar tudo sobrando embaixo. */}
            <div className="flex min-w-0 flex-col items-center md:w-[320px] md:shrink-0">
              <PreviewStack
                tabs={tabs}
                active={active}
                weekdayLabels={weekdayLabels}
                mockupLabels={mockupLabels}
                teamRoles={teamRoles}
              />
            </div>

            {/* conteúdo */}
            <div className="flex min-w-0 flex-col items-center text-center md:max-w-[496px] md:flex-1 md:items-start md:text-left">
              <Badge
                variant="outline"
                className="border-border bg-secondary/50 text-secondary-foreground mb-4"
              >
                {badge}
              </Badge>

              <h1 className="text-foreground mb-4 text-5xl font-bold tracking-tight text-balance sm:text-6xl lg:mb-5 lg:text-[64px] xl:text-[72px] xl:leading-[1.02]">
                {titleLine1}
                <br />
                <span className="text-primary drop-shadow-[0_0_28px_rgba(230,57,70,0.3)]">
                  {titleLine2}
                </span>
              </h1>

              <p className="text-muted-foreground text-base text-balance lg:text-lg">
                {subtitle}
              </p>

              <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start lg:mt-8">
                <Button
                  asChild
                  size="lg"
                  className="shadow-primary/25 shadow-lg"
                >
                  <a href={ctaPrimary.href}>{ctaPrimary.label}</a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-border text-foreground hover:bg-muted bg-transparent"
                >
                  <a href={ctaSecondary.href}>{ctaSecondary.label}</a>
                </Button>
              </div>

              <div className="text-muted-foreground mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs lg:mt-8 lg:justify-start">
                {trustItems.map((item, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {item.icon}
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
