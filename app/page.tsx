import { SiteNav } from "@/app/_components/marketing/site-nav";
import { Hero } from "@/app/_components/marketing/hero";
import { FeaturesSection } from "@/app/_components/marketing/features-section";
import { HowItWorks } from "@/app/_components/marketing/how-it-works";
import { BookingExperienceSection } from "@/app/_components/marketing/booking-experience-section";
import { NoShowCalculator } from "@/app/_components/marketing/no-show-calculator";
import { PricingSection } from "@/app/_components/marketing/pricing-section";
import { BonusBenefitsStrip } from "@/app/_components/marketing/bonus-benefits-strip";
import { FaqSection } from "@/app/_components/marketing/faq-section";
import { MobileShowcaseSection } from "@/app/_components/marketing/mobile-showcase-section";
import { FinalCta } from "@/app/_components/marketing/final-cta";
import { SiteFooter } from "@/app/_components/marketing/site-footer";

export default function PlatformHome() {
  return (
    <main className="theme-marketing bg-background text-foreground">
      <SiteNav />
      <Hero />
      <FeaturesSection />
      <HowItWorks />
      <BookingExperienceSection />
      <NoShowCalculator />
      <PricingSection />
      <BonusBenefitsStrip />
      <FaqSection />
      <MobileShowcaseSection />
      <FinalCta />
      <SiteFooter />
    </main>
  );
}
