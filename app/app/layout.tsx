import { getTranslations } from "next-intl/server";
import { BottomNav } from "./bottom-nav";

export default async function CustomerAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("app.nav");

  return (
    <div className="theme-discover min-h-screen bg-background text-foreground">
      <div className="pb-16">{children}</div>
      <BottomNav labels={{ home: t("home"), bookings: t("bookings"), account: t("account") }} />
    </div>
  );
}
