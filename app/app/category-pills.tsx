import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Scissors, Sparkles, Hand, HeartPulse, Stethoscope, Smile, Zap, HardHat, Store } from "lucide-react";
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

export const CATEGORY_ICONS: Record<string, (typeof CATEGORIES)[number]["Icon"]> = Object.fromEntries(
  CATEGORIES.map(({ value, Icon }) => [value, Icon]),
);

export async function CategoryPills({ active }: { active?: string }) {
  const t = await getTranslations("businessCategories");

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden">
      {CATEGORIES.map(({ value, Icon }) => {
        const isActive = active === value;
        return (
          <Link
            key={value}
            href={isActive ? "/" : `/?category=${value}`}
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
