import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  LayoutGrid,
  Scissors,
  Sparkles,
  Hand,
  HeartPulse,
  Stethoscope,
  Smile,
  Zap,
  HardHat,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { value: "BARBERSHOP", Icon: Scissors },
  { value: "HAIR_SALON", Icon: Sparkles },
  { value: "NAIL_SALON", Icon: Hand },
  { value: "BEAUTY_SALON", Icon: HeartPulse },
  { value: "MEDICAL", Icon: Stethoscope },
  { value: "DENTAL", Icon: Smile },
  { value: "ELECTRICIAN", Icon: Zap },
  { value: "CONSTRUCTION", Icon: HardHat },
  { value: "OTHER", Icon: Store },
] as const;

export const CATEGORY_VALUES = CATEGORIES.map((c) => c.value);

export const CATEGORY_ICONS: Record<
  string,
  (typeof CATEGORIES)[number]["Icon"]
> = Object.fromEntries(CATEGORIES.map(({ value, Icon }) => [value, Icon]));

function buildHref(q: string | undefined, category?: string) {
  const params = new URLSearchParams();
  if (q?.trim()) params.set("q", q);
  if (category) params.set("category", category);
  const qs = params.toString();
  return qs ? `/?${qs}` : "/";
}

export async function CategoryPills({ active, q }: { active?: string; q?: string }) {
  const t = await getTranslations("businessCategories");
  const tApp = await getTranslations("app");

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
      <Link
        href={buildHref(q)}
        className={cn(
          "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
          !active
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border text-foreground hover:bg-accent hover:text-accent-foreground",
        )}
      >
        <LayoutGrid className="size-4" />
        {tApp("categoriesAll")}
      </Link>
      {CATEGORIES.map(({ value, Icon }) => {
        const isActive = active === value;
        return (
          <Link
            key={value}
            href={buildHref(q, value)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
              isActive
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="size-4" />
            {t(value)}
          </Link>
        );
      })}
    </div>
  );
}
