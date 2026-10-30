import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function SiteFooter() {
  const t = await getTranslations("landing.footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-border bg-background border-t px-6 py-16 text-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 md:flex-row md:justify-between">
        <div className="max-w-xs">
          <p className="text-foreground text-lg font-semibold">Bladiq</p>
          <p className="text-muted-foreground mt-2">{t("tagline")}</p>
        </div>
        <div className="flex gap-16">
          <div>
            <p className="text-foreground mb-3 font-medium">
              {t("productTitle")}
            </p>
            <ul className="text-muted-foreground flex flex-col gap-2">
              <li>
                <a href="#features" className="hover:text-foreground">
                  {t("featuresLink")}
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-foreground">
                  {t("pricingLink")}
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-foreground mb-3 font-medium">
              {t("legalTitle")}
            </p>
            <ul className="text-muted-foreground flex flex-col gap-2">
              <li>
                <Link href="/impressum" className="hover:text-foreground">
                  {t("impressumLink")}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-foreground">
                  {t("privacyLink")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-foreground">
                  {t("termsLink")}
                </Link>
              </li>
              <li>
                <Link href="/dpa" className="hover:text-foreground">
                  {t("dpaLink")}
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <p className="text-muted-foreground/70 mx-auto mt-12 max-w-6xl">
        {t("copyright", { year })}
      </p>
    </footer>
  );
}
