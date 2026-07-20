import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/app/_components/ui/button";
import { LocaleSwitcher } from "@/app/_components/locale-switcher";
import { getRootUrl } from "@/lib/tenant-host";

export async function SiteNav() {
  const t = await getTranslations("landing.nav");

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          Bladiq
        </Link>
        <div className="hidden items-center gap-8 text-sm text-neutral-300 md:flex">
          <a href="#features" className="transition-colors hover:text-white">{t("features")}</a>
          <a href="#pricing" className="transition-colors hover:text-white">{t("pricing")}</a>
          <a href="#faq" className="transition-colors hover:text-white">{t("faq")}</a>
        </div>
        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          <Button asChild size="sm" variant="outline" className="border-white/15 bg-transparent text-white hover:bg-white/10">
            <Link href={getRootUrl("/sign-in")}>{t("signIn")}</Link>
          </Button>
          <Button asChild size="sm">
            <Link href={getRootUrl("/sign-up")}>{t("startFree")}</Link>
          </Button>
        </div>
      </nav>
    </header>
  );
}
