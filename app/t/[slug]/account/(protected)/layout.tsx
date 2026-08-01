import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, CalendarDays, LayoutDashboard, User, Ticket, MessageCircle } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { resolveTenantSlug } from "@/lib/tenant-host";
import { getOrganizationBySlug } from "@/lib/services/organization-service";
import { SidebarNav, type NavItem } from "@/app/(protected)/dashboard/sidebar-nav";
import { MobileNav } from "@/app/(protected)/dashboard/mobile-nav";
import { AccountUserMenu } from "./account-user-menu";

/**
 * Shell da área logada do cliente final ({slug}.{root}/account) —
 * separado do app/(protected)/dashboard (staff): aqui a identidade é um
 * Customer, não um Member, e não há RBAC nenhuma pra checar.
 */
export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const slug = resolveTenantSlug(requestHeaders.get("host"));
  if (!slug) redirect("/");
  if (!session?.user) redirect("/account/sign-in");
  const organization = await getOrganizationBySlug(slug);
  if (!organization) redirect("/");

  const t = await getTranslations("account");
  const navItems: NavItem[] = [
    { href: "/account", label: t("nav.overview"), icon: <LayoutDashboard className="size-4 shrink-0" /> },
    { href: "/account/bookings", label: t("nav.bookings"), icon: <CalendarDays className="size-4 shrink-0" /> },
    { href: "/account/profile", label: t("nav.profile"), icon: <User className="size-4 shrink-0" /> },
    { href: "/account/coupons", label: t("nav.coupons"), icon: <Ticket className="size-4 shrink-0" /> },
    { href: "/account/messages", label: t("nav.messages"), icon: <MessageCircle className="size-4 shrink-0" /> },
  ];
  const userMenu = (
    <div className="flex flex-col gap-2">
      <Link
        href="/"
        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs font-medium text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
      >
        <ArrowLeft className="size-3.5" />
        {t("backToSite")}
      </Link>
      <AccountUserMenu
        name={session.user.name}
        email={session.user.email}
        slug={slug}
        signOutLabel={t("signOut")}
        signingOutLabel={t("signingOut")}
        signOutErrorFallback={t("signOutError")}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-muted/30 md:flex">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="truncate border-b border-sidebar-border px-4 py-4 font-semibold tracking-tight">
          {organization.name}
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <SidebarNav items={navItems} />
        </div>
        <div className="border-t border-sidebar-border p-3">{userMenu}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b bg-background/95 px-4 py-3 backdrop-blur md:hidden">
          <MobileNav organizationName={organization.name} navItems={navItems} userMenu={userMenu} />
          <span className="truncate font-semibold tracking-tight">{organization.name}</span>
        </header>
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
