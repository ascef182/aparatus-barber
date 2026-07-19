import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function SiteFooter() {
  const t = await getTranslations("landing.footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-neutral-950 px-6 py-16 text-sm">
      <div className="mx-auto flex max-w-6xl flex-col gap-12 md:flex-row md:justify-between">
        <div className="max-w-xs">
          <p className="text-lg font-semibold text-white">Bladiq</p>
          <p className="mt-2 text-neutral-500">{t("tagline")}</p>
        </div>
        <div className="flex gap-16">
          <div>
            <p className="mb-3 font-medium text-white">{t("productTitle")}</p>
            <ul className="flex flex-col gap-2 text-neutral-400">
              <li><a href="#features" className="hover:text-white">{t("featuresLink")}</a></li>
              <li><a href="#pricing" className="hover:text-white">{t("pricingLink")}</a></li>
            </ul>
          </div>
          <div>
            <p className="mb-3 font-medium text-white">{t("legalTitle")}</p>
            <ul className="flex flex-col gap-2 text-neutral-400">
              <li><Link href="/impressum" className="hover:text-white">{t("impressumLink")}</Link></li>
              <li><Link href="/privacy" className="hover:text-white">{t("privacyLink")}</Link></li>
              <li><Link href="/terms" className="hover:text-white">{t("termsLink")}</Link></li>
              <li><Link href="/dpa" className="hover:text-white">{t("dpaLink")}</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-12 max-w-6xl text-neutral-600">{t("copyright", { year })}</p>
    </footer>
  );
}
