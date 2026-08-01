import { headers } from "next/headers";
import Link from "next/link";
import { ChevronRight, Ticket, User } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getTenantUrl } from "@/lib/tenant-host";
import { listCouponsForUser, listOrganizationsWithCustomerForUser } from "@/lib/services/customer-app-service";
import { AppPageHeader } from "../page-header";
import { AuthPrompt } from "../auth-prompt";
import { CATEGORY_ICONS } from "../category-pills";
import { EditNameForm, SignOutButton } from "./account-actions";

function initialsOf(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}

export default async function CustomerAppAccountPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const t = await getTranslations("app.account");

  if (!session?.user) {
    return (
      <AuthPrompt
        icon={User}
        title={t("signInPrompt")}
        description={t("signInPromptDescription")}
        ctaLabel={t("signInCta")}
      />
    );
  }

  const [businesses, coupons, locale] = await Promise.all([
    listOrganizationsWithCustomerForUser(session.user.id),
    listCouponsForUser(session.user.id),
    getLocale(),
  ]);
  // This is a server-render timestamp used only to flag expired coupons.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <>
      <AppPageHeader title={t("title")} />
      <main className="mx-auto flex max-w-2xl flex-col gap-8 p-5">
        <section className="flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <div className="bg-primary/10 text-primary ring-primary/20 flex size-14 shrink-0 items-center justify-center rounded-full text-lg font-bold ring-2">
              {initialsOf(session.user.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-lg font-bold tracking-tight">
                {session.user.name}
              </p>
              <p className="text-muted-foreground truncate text-sm">
                {session.user.email}
              </p>
            </div>
          </div>
          <EditNameForm initialName={session.user.name} />
        </section>

        <section>
          <h2 className="text-muted-foreground mb-2 text-xs font-semibold uppercase">
            {t("businessesTitle")}
          </h2>
          {businesses.length === 0 ? (
            <div className="border-border flex flex-col items-center gap-4 rounded-2xl border border-dashed py-12 text-center">
              <p className="text-muted-foreground text-sm">
                {t("businessesEmpty")}
              </p>
              <Link
                href="/"
                className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
              >
                {t("exploreCta")}
              </Link>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {businesses.map(
                ({ organizationId, organization, hasUnreadMessages }) => {
                  const CategoryIcon =
                    CATEGORY_ICONS[organization.category] ??
                    CATEGORY_ICONS.OTHER;
                  return (
                    <a
                      key={organizationId}
                      href={getTenantUrl(
                        organization.slug,
                        hasUnreadMessages ? "/account/messages" : "/account",
                      )}
                      className="border-border bg-card hover:border-primary/40 flex items-center gap-3 rounded-2xl border p-3 transition-colors"
                    >
                      <div className="relative shrink-0">
                        {organization.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element -- vem do Cloudinary, fora dos remotePatterns de next/image
                          <img
                            src={organization.logo}
                            alt=""
                            className="size-11 rounded-full object-cover"
                          />
                        ) : (
                          <div className="bg-accent flex size-11 items-center justify-center rounded-full">
                            <CategoryIcon className="text-accent-foreground size-5" />
                          </div>
                        )}
                        {hasUnreadMessages && (
                          <span className="bg-primary ring-card absolute -top-0.5 -right-0.5 size-2.5 rounded-full ring-2" />
                        )}
                      </div>
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {organization.name}
                      </span>
                      {hasUnreadMessages && (
                        <span className="text-primary shrink-0 text-xs font-medium">
                          {t("newMessage")}
                        </span>
                      )}
                      <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                    </a>
                  );
                },
              )}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-muted-foreground mb-2 text-xs font-semibold uppercase">
            {t("couponsTitle")}
          </h2>
          {coupons.length === 0 ? (
            <p className="text-muted-foreground text-sm">{t("couponsEmpty")}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {coupons.map(({ id, coupon, organization }) => {
                const expired = Boolean(coupon.validUntil && coupon.validUntil.getTime() < now);
                const inactive = !coupon.isActive || expired;
                const value =
                  coupon.type === "PERCENT"
                    ? t("percentOff", { value: coupon.value })
                    : t("amountOff", {
                        value: new Intl.NumberFormat(locale, { style: "currency", currency: organization.currency }).format(
                          coupon.value / 100,
                        ),
                      });
                return (
                  <a
                    key={id}
                    href={getTenantUrl(organization.slug, "/account/coupons")}
                    className={`border-border bg-card hover:border-primary/40 flex items-center gap-3 rounded-2xl border p-3 transition-colors ${inactive ? "opacity-60" : ""}`}
                  >
                    <div className="bg-accent flex size-11 shrink-0 items-center justify-center rounded-full">
                      <Ticket className="text-accent-foreground size-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{organization.name}</p>
                      <p className="text-muted-foreground truncate font-mono text-xs">{coupon.code}</p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-primary">
                      {inactive ? t("couponExpired") : value}
                    </span>
                    <ChevronRight className="text-muted-foreground size-4 shrink-0" />
                  </a>
                );
              })}
            </div>
          )}
        </section>

        <SignOutButton />
      </main>
    </>
  );
}
