import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  CalendarDays,
  CircleAlert,
  Contact,
  CreditCard,
  LayoutDashboard,
  Scissors,
  Settings,
  ShieldAlert,
  TriangleAlert,
  Users,
} from "lucide-react";
import { auth } from "@/lib/auth";
import { resolveTenantSlug } from "@/lib/tenant-host";
import { getOrganizationBySlug, isFreeTrialExpired, isSetupComplete } from "@/lib/services/organization-service";
import { ensureMfaGracePeriod, getMembership } from "@/lib/services/member-service";
import { isAppRole } from "@/lib/auth/permissions";
import { Badge } from "@/app/_components/ui/badge";
import { DashboardTour } from "./dashboard-tour";
import { SidebarNav, type NavItem } from "./sidebar-nav";
import { UserMenu } from "./user-menu";
import { MobileNav } from "./mobile-nav";

const MFA_EXEMPT_PREFIX = "/dashboard/settings";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const slug = resolveTenantSlug(requestHeaders.get("host"));
  if (!session?.user || !slug) redirect("/");
  const organization = await getOrganizationBySlug(slug);
  if (!organization) redirect("/");
  const membership = await getMembership(organization.id, session.user.id);
  if (!membership) redirect("/");

  const trialExpired = isFreeTrialExpired(organization);
  const readOnly = trialExpired;
  const needsMfaSetup = (membership.role === "owner" || session.user.role === "superadmin") && !session.user.twoFactorEnabled;

  // Redirect obrigatório após o prazo (7 dias) — nunca em /dashboard/settings,
  // a única página que permite cumprir a exigência. Prazo é escrito na
  // primeira vez que é lido (contas criadas antes desta feature não têm
  // mfaGracePeriodEndsAt salvo ainda).
  if (needsMfaSetup) {
    const deadline = membership.mfaGracePeriodEndsAt ?? (await ensureMfaGracePeriod(organization.id, session.user.id));
    const pathname = requestHeaders.get("x-pathname") ?? "";
    const isExempt = pathname === MFA_EXEMPT_PREFIX || pathname.startsWith(`${MFA_EXEMPT_PREFIX}/`);
    if (deadline && deadline < new Date() && !isExempt) {
      redirect(`${MFA_EXEMPT_PREFIX}?mfaRequired=1`);
    }
  }

  const setupComplete = await isSetupComplete(organization.id);
  const t = await getTranslations("dashboard");
  const tRoles = await getTranslations("roles");
  const roleLabel = isAppRole(membership.role) ? tRoles(membership.role) : membership.role;

  const navIconClass = "size-4 shrink-0";
  const navItems: NavItem[] = [
    { href: "/dashboard", label: t("nav.overview"), icon: <LayoutDashboard className={navIconClass} /> },
    { href: "/dashboard/agenda", label: t("nav.agenda"), icon: <CalendarDays className={navIconClass} /> },
    { href: "/dashboard/services", label: t("nav.services"), icon: <Scissors className={navIconClass} /> },
    { href: "/dashboard/staff", label: t("nav.staff"), icon: <Users className={navIconClass} /> },
    { href: "/dashboard/customers", label: t("nav.customers"), icon: <Contact className={navIconClass} /> },
    { href: "/dashboard/settings", label: t("nav.settings"), icon: <Settings className={navIconClass} /> },
    ...(membership.role === "owner"
      ? [{ href: "/dashboard/billing", label: t("nav.billing"), icon: <CreditCard className={navIconClass} /> }]
      : []),
  ];

  const userMenuProps = {
    name: session.user.name,
    email: session.user.email,
    roleLabel,
    signOutLabel: t("userMenu.signOut"),
    signingOutLabel: t("userMenu.signingOut"),
    themeLabel: t("userMenu.theme"),
    signOutErrorFallback: t("userMenu.signOutError"),
  };

  return (
    <div className="min-h-screen bg-muted/30 md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <Link href="/dashboard" className="truncate border-b border-sidebar-border px-4 py-4 font-semibold tracking-tight">
          {organization.name}
        </Link>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav items={navItems} />
        </div>
        <div className="border-t border-sidebar-border p-3">
          <UserMenu {...userMenuProps} />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur md:justify-end md:px-6">
          <MobileNav organizationName={organization.name} navItems={navItems} userMenuProps={userMenuProps} />
          <Link href="/dashboard" className="truncate font-semibold tracking-tight md:hidden">
            {organization.name}
          </Link>
          <Badge variant={readOnly ? "destructive" : "secondary"} className="ml-auto md:ml-0">
            {readOnly ? t("layout.readOnly") : organization.subscriptionStatus.toLowerCase()}
          </Badge>
        </header>

        {!setupComplete && (
          <div className="flex items-start gap-2 border-b bg-primary/10 px-4 py-3 text-sm text-primary md:px-6">
            <CircleAlert className="mt-0.5 size-4 shrink-0" />
            <p>
              {t("layout.completeSetupPrefix")}{" "}
              <Link href="/dashboard/staff" className="underline underline-offset-2">
                {t("layout.workingHoursLink")}
              </Link>{" "}
              ·{" "}
              <Link href="/dashboard/services" className="underline underline-offset-2">
                {t("layout.servicesLink")}
              </Link>{" "}
              ·{" "}
              <Link href="/dashboard/staff" className="underline underline-offset-2">
                {t("layout.staffServiceLink")}
              </Link>
            </p>
          </div>
        )}
        {needsMfaSetup && (
          <div className="flex items-start gap-2 border-b bg-amber-500/10 px-4 py-3 text-sm text-amber-700 dark:text-amber-400 md:px-6">
            <ShieldAlert className="mt-0.5 size-4 shrink-0" />
            <Link href="/dashboard/settings" className="underline underline-offset-2">
              {t("layout.mfaBanner")}
            </Link>
          </div>
        )}
        {trialExpired && (
          <div className="flex items-start gap-2 border-b bg-destructive/10 px-4 py-3 text-sm text-destructive md:px-6">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <Link href="/dashboard/billing" className="underline underline-offset-2">
              {t("layout.trialExpiredBanner")}
            </Link>
          </div>
        )}

        <DashboardTour />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
