import { getTranslations } from "next-intl/server";
import { Reveal } from "./reveal";

/**
 * Seção decorativa (sem screenshots reais) que mostra o app rodando em
 * desktop + mobile ao mesmo tempo — reforço visual antes do Final CTA.
 * Cores/ícones puramente ilustrativos, refletindo as áreas reais do
 * dashboard (Agenda, Serviços, Clientes, Equipe).
 */

const FEATURE_ITEMS = [
  { key: "overview", color: "bg-blue-500", icon: "📊" },
  { key: "agenda", color: "bg-emerald-500", icon: "📅" },
  { key: "services", color: "bg-purple-500", icon: "✂️" },
  { key: "customers", color: "bg-orange-500", icon: "👥" },
  { key: "staff", color: "bg-pink-500", icon: "🧑‍💼" },
  { key: "more", color: "bg-white/10", icon: "+" },
] as const;

export async function MobileShowcaseSection() {
  const t = await getTranslations("landing.mobileShowcase");

  return (
    <section className="relative overflow-hidden bg-neutral-950 px-6 py-24">
      <div className="mx-auto flex max-w-6xl flex-col-reverse items-center gap-16 lg:flex-row lg:items-center lg:justify-between">
        <Reveal className="max-w-md space-y-4 text-center lg:text-left">
          <h2 className="text-balance text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            {t("title")}
          </h2>
          <p className="text-lg text-neutral-400">{t("subtitle")}</p>
        </Reveal>

        <Reveal delay={0.15} className="relative mx-auto mt-8 w-full max-w-md lg:mt-0 lg:mr-12">
          {/* janela de desktop */}
          <div className="relative rotate-2 overflow-hidden rounded-2xl border border-white/10 bg-neutral-900 shadow-2xl shadow-black/40 transition-transform duration-300 hover:rotate-1 max-sm:hidden">
            <div className="border-b border-white/10 bg-white/5 px-6 py-4">
              <div className="flex items-center space-x-2">
                <div className="h-3 w-3 rounded-full bg-red-500" />
                <div className="h-3 w-3 rounded-full bg-yellow-500" />
                <div className="h-3 w-3 rounded-full bg-green-500" />
              </div>
            </div>

            <div className="min-h-[320px] bg-neutral-950 p-8">
              <div className="mb-8 flex items-center space-x-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary font-bold text-primary-foreground shadow-lg">
                  B
                </div>
                <span className="text-lg font-semibold text-white">Bladiq</span>
              </div>

              <div className="mb-8 space-y-3">
                <h3 className="font-medium text-neutral-400">{t("quickActions")}</h3>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full w-3/4 rounded-full bg-primary" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                {FEATURE_ITEMS.map((item) => (
                  <div key={item.key} className="group flex cursor-pointer flex-col items-center space-y-2">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl shadow-md transition-transform duration-200 group-hover:scale-110 ${item.color}`}
                    >
                      <span className="text-sm font-bold text-white">{item.icon}</span>
                    </div>
                    <span className="text-center text-xs font-medium text-neutral-400">
                      {t(`features.${item.key}`)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* janelas empilhadas atrás */}
            <div
              aria-hidden
              className="absolute -left-4 -top-4 -z-10 h-full w-full rotate-6 rounded-2xl bg-gradient-to-br from-orange-500/60 to-orange-600/60 shadow-xl"
            />
            <div
              aria-hidden
              className="absolute -left-8 -top-8 -z-20 h-full w-full rotate-12 rounded-2xl bg-gradient-to-br from-purple-500/60 to-purple-600/60 shadow-xl"
            />
          </div>

          {/* mockup mobile */}
          <div className="absolute -bottom-4 -right-6 w-56 -rotate-12 rounded-[2.5rem] bg-neutral-900 p-2 shadow-2xl transition-transform duration-300 hover:-rotate-6 sm:-right-24 sm:h-[28rem] md:-bottom-12 md:-right-12 md:h-80 md:w-44">
            <div className="h-full w-full overflow-hidden rounded-[2rem] border border-white/10 bg-neutral-950">
              <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-6 py-3 text-xs">
                <span className="font-semibold text-white">9:41</span>
                <div className="flex items-center space-x-1">
                  <div className="h-2 w-4 rounded-sm bg-green-500" />
                  <span className="font-medium text-neutral-400">100%</span>
                </div>
              </div>

              <div className="space-y-6 p-4">
                <div className="flex items-center space-x-3">
                  <div className="h-8 w-8 rounded-xl bg-primary shadow-md" />
                  <span className="text-sm font-semibold text-white">Bladiq</span>
                </div>

                <div className="grid grid-cols-4 gap-3">
                  {Array.from({ length: 16 }).map((_, i) => (
                    <div key={i} className="aspect-square rounded-xl bg-white/5 transition-colors hover:bg-white/10" />
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
