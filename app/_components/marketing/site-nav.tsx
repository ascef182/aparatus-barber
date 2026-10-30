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
    <header className="border-border bg-background/80 sticky top-0 z-50 border-b backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="text-foreground text-lg font-semibold tracking-tight"
        >
          Bladiq
        </Link>
        <div className="text-muted-foreground hidden items-center gap-8 text-sm md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-4">
          <LocaleSwitcher />
          <div className="hidden items-center gap-4 md:flex">
            <Button
              asChild
              size="sm"
              variant="outline"
              className="border-border text-foreground hover:bg-muted bg-transparent"
            >
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
