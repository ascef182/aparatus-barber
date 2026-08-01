import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/app/_components/ui/button";
import { LocaleSwitcher } from "@/app/_components/locale-switcher";
import { getRootUrl } from "@/lib/tenant-host";
import { MobileNav } from "./mobile-nav";

export async function SiteNav() {
  const t = await getTranslations("landing.nav");
  const signInHref = getRootUrl("/sign-in");
  const startFreeHref = getRootUrl("/sign-up");
  const links = [
    { href: "#features", label: t("features") },
    { href: "#pricing", label: t("pricing") },
    { href: "#faq", label: t("faq") },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-neutral-950/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-white">
          Bladiq
        </Link>
        <div className="hidden items-center gap-8 text-sm text-neutral-300 md:flex">
          {links.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-white">{link.label}</a>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          <div className="hidden items-center gap-4 md:flex">
            <Button asChild size="sm" variant="outline" className="border-white/15 bg-transparent text-white hover:bg-white/10">
              <Link href={signInHref}>{t("signIn")}</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={startFreeHref}>{t("startFree")}</Link>
            </Button>
          </div>
          <MobileNav
            links={links}
            signInHref={signInHref}
            signInLabel={t("signIn")}
            startFreeHref={startFreeHref}
            startFreeLabel={t("startFree")}
          />
        </div>
      </nav>
    </header>
  );
}
