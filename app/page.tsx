import { SiteNav } from "@/app/_components/marketing/site-nav";
import { Hero } from "@/app/_components/marketing/hero";
import { FeaturesSection } from "@/app/_components/marketing/features-section";
import { HowItWorks } from "@/app/_components/marketing/how-it-works";
import { PricingSection } from "@/app/_components/marketing/pricing-section";
import { FaqSection } from "@/app/_components/marketing/faq-section";
import { FinalCta } from "@/app/_components/marketing/final-cta";
import { SiteFooter } from "@/app/_components/marketing/site-footer";

export default function PlatformHome() {
  return (
    <main className="bg-neutral-950">
      <SiteNav />
      <Hero />
      <FeaturesSection />
      <HowItWorks />
      <PricingSection />
      <FaqSection />
      <FinalCta />
      <SiteFooter />
    </main>
  );
}
