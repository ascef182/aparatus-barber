"use client";

import * as React from "react";
import { Battery, Calendar, Check, Clock, CreditCard, Signal, Users, Wifi } from "lucide-react";
import { useMotionValueEvent, useReducedMotion, useScroll } from "motion/react";
import { cn } from "@/lib/utils";
import { Badge } from "@/app/_components/ui/badge";
import { Button } from "@/app/_components/ui/button";

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
}

export interface TrustItem {
  icon: React.ReactNode;
  label: string;
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
  scrollLength?: string;
}

const TAB_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  booking: Clock,
  availability: Calendar,
  payments: CreditCard,
  team: Users,
};

/**
 * Conteúdo esquemático por aba — puramente ilustrativo (sem screenshots
 * reais), mesma lógica visual do MobileShowcaseSection: barras, pílulas e
 * tiles em vez de texto, pra parecer tela de produto sem precisar de i18n
 * extra por elemento.
 */
function TabScreen({ id }: { id: string }) {
  if (id === "booking") {
    const slots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"];
    return (
      <div className="grid grid-cols-3 gap-2">
        {slots.map((slot, i) => (
          <div
            key={slot}
            className={cn(
              "flex items-center justify-center rounded-lg py-2 text-xs font-medium tabular-nums",
              i === 2 ? "bg-primary text-primary-foreground" : "bg-white/[0.06] text-neutral-400",
            )}
          >
            {slot}
          </div>
        ))}
      </div>
    );
  }

  if (id === "availability") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-7 gap-1.5" aria-hidden>
          {Array.from({ length: 7 }).map((_, i) => (
            <div
              key={i}
              className={cn("h-6 rounded-md", i === 4 ? "bg-white/10" : "bg-primary/70")}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-2.5">
          <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
          <div className="h-1.5 w-full rounded-full bg-white/10">
            <div className="h-full w-full rounded-full bg-primary/60" />
          </div>
        </div>
      </div>
    );
  }

  if (id === "payments") {
    return (
      <div className="space-y-3">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10" aria-hidden>
          <div className="flex h-full w-full">
            <div className="h-full w-[30%] bg-primary" />
            <div className="h-full flex-1 bg-white/15" />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-primary/15 px-3 py-2.5">
          <div className="h-2 w-16 rounded-full bg-primary/40" aria-hidden />
          <Check className="size-4 text-primary" aria-hidden />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex -space-x-2" aria-hidden>
        {["A", "B", "C", "D"].map((letter, i) => (
          <div
            key={letter}
            className="flex size-8 items-center justify-center rounded-full bg-neutral-800 text-[10px] font-medium text-neutral-300 ring-2 ring-black"
            style={{ zIndex: 4 - i }}
          >
            {letter}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2" aria-hidden>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 rounded-lg bg-white/[0.06]" />
        ))}
      </div>
    </div>
  );
}

function PhonePanel({ id, title, subtitle }: { id: string; title: string; subtitle: string }) {
  const Icon = TAB_ICONS[id] ?? Clock;
  return (
    <div className="relative mx-auto w-full max-w-[300px] px-2">
      <div
        className="absolute inset-x-6 top-6 -z-10 h-40 rounded-full bg-primary/25 blur-3xl"
        aria-hidden
      />
      <div className="overflow-hidden rounded-[2.5rem] bg-neutral-900 p-2 shadow-2xl shadow-black/50 ring-1 ring-white/10">
        <div className="flex h-[clamp(380px,42vh,460px)] flex-col overflow-hidden rounded-[2rem] bg-black px-5 ring-1 ring-white/10">
          <div className="flex items-center justify-between pt-3 pb-1 text-xs text-white">
            <span className="font-semibold">9:41</span>
            <div className="flex items-end gap-1">
              <Signal aria-hidden className="size-4" />
              <Wifi aria-hidden className="size-[18px]" />
              <Battery aria-hidden className="-mb-px size-5" />
            </div>
          </div>
          <div className="mx-auto mt-2 h-1.5 w-10 shrink-0 rounded-full bg-white/15" />

          <div className="mt-6 flex items-center gap-2">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <Icon aria-hidden className="size-4" />
            </div>
            <p className="min-w-0 flex-1 text-[15px] leading-snug font-semibold tracking-tight break-words text-white">{title}</p>
          </div>

          <div className="mt-5">
            <TabScreen id={id} />
          </div>

          <p className="mt-auto mb-5 text-xs leading-relaxed text-neutral-500">{subtitle}</p>
        </div>
      </div>
    </div>
  );
}

function TabRail({
  tabs,
  active,
  onSelect,
}: {
  tabs: PreviewTab[];
  active: number;
  onSelect: (i: number) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Preview do produto"
      className="flex w-full shrink-0 flex-wrap justify-center gap-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((t, i) => {
        const isActive = i === active;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onSelect(i)}
            className={cn(
              "whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950",
              isActive
                ? "bg-white/10 font-semibold text-white ring-1 ring-white/15"
                : "text-neutral-400 hover:bg-white/5 hover:text-white",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

function PreviewStack({ tabs, active }: { tabs: PreviewTab[]; active: number }) {
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
              isActive ? "relative opacity-100" : "pointer-events-none absolute inset-0 opacity-0",
            )}
          >
            <PhonePanel id={t.id} title={t.title} subtitle={t.subtitle} />
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

  const handleSelect = (i: number) => {
    const el = sectionRef.current;
    if (scrollDriven && el) {
      const top = window.scrollY + el.getBoundingClientRect().top;
      const range = el.offsetHeight - window.innerHeight;
      const target = top + ((i + 0.5) / tabs.length) * range;
      window.scrollTo({ top: Math.max(0, target), behavior: "smooth" });
    } else {
      setActive(i);
    }
  };

  return (
    <section
      ref={sectionRef}
      aria-label="Hero"
      className="relative w-full bg-neutral-950 md:motion-safe:h-[var(--hero-scroll-length)]"
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
        <div className="absolute inset-x-0 top-0 -z-10 h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(87,175,120,0.24),transparent_65%)]" aria-hidden />
        <div className="mx-auto flex w-full max-w-7xl flex-col justify-center px-6 py-10 lg:py-14">
          <div className="flex flex-col-reverse justify-center gap-8 md:flex-row md:items-start md:gap-10 xl:gap-[72px]">
            {/* abas + preview do celular — pílulas horizontais em cima do
                celular (não mais uma coluna ao lado dele disputando
                largura), pra dar a largura toda pro mockup em vez de
                espremê-lo contra a régua de abas verticais.
                md:mt-11 alinha o topo com o <h1>, compensando a badge acima
                dele na coluna de texto */}
            <div className="flex min-w-0 flex-col items-center gap-5 md:mt-11 md:w-[320px] md:shrink-0">
              <TabRail tabs={tabs} active={active} onSelect={handleSelect} />
              <PreviewStack tabs={tabs} active={active} />
            </div>

            {/* conteúdo */}
            <div className="flex min-w-0 flex-col items-center text-center md:max-w-[496px] md:flex-1 md:items-start md:text-left">
              <Badge variant="outline" className="mb-4 border-white/15 bg-white/5 text-neutral-300">
                {badge}
              </Badge>

              <h1 className="mb-4 text-balance text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:mb-5 lg:text-[56px] xl:text-[60px] xl:leading-[1.05]">
                {titleLine1}
                <br />
                <span className="text-primary drop-shadow-[0_0_28px_rgba(87,175,120,0.35)]">
                  {titleLine2}
                </span>
              </h1>

              <p className="text-balance text-base text-neutral-400 lg:text-lg">{subtitle}</p>

              <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start lg:mt-8">
                <Button asChild size="lg" className="shadow-lg shadow-primary/25">
                  <a href={ctaPrimary.href}>{ctaPrimary.label}</a>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/15 bg-transparent text-white hover:bg-white/10"
                >
                  <a href={ctaSecondary.href}>{ctaSecondary.label}</a>
                </Button>
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-neutral-500 lg:mt-8 lg:justify-start">
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
