import { headers } from "next/headers";
import Link from "next/link";
import { CalendarDays, ChevronRight } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth";
import { getTenantUrl } from "@/lib/tenant-host";
import { listBookingsForUser } from "@/lib/services/customer-app-service";
import type { BookingStatus } from "@/generated/prisma/client";
import { AppPageHeader } from "../page-header";
import { AuthPrompt } from "../auth-prompt";
import { CATEGORY_ICONS } from "../category-pills";
import { BOOKING_STATUS_STYLE } from "../booking-status";

/**
 * Agregado cross-tenant, somente leitura (ver lib/services/customer-app-service.ts).
 * Ações (cancelar) não são replicadas aqui — cada item linka pra
 * {slug}.{root}/account/bookings, que já tem cancelMyBooking rodando dentro
 * de runWithTenant com a validação de dono da reserva.
 */
export default async function CustomerAppBookingsPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  const t = await getTranslations("app.bookings");

  if (!session?.user) {
    return (
      <AuthPrompt
        icon={CalendarDays}
        title={t("signInPrompt")}
        description={t("signInPromptDescription")}
        ctaLabel={t("signInCta")}
      />
    );
  }

  const [bookings, locale] = await Promise.all([
    listBookingsForUser(session.user.id),
    getLocale(),
  ]);
  // This is a server-render timestamp used only to partition historical data.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const upcoming = bookings.filter((b) => b.startAt.getTime() >= now).reverse();
  const past = bookings.filter((b) => b.startAt.getTime() < now);
  const statusLabels: Record<BookingStatus, string> = {
    PENDING_PAYMENT: t("status.pendingPayment"),
    PENDING: t("status.pending"),
    CONFIRMED: t("status.confirmed"),
    COMPLETED: t("status.completed"),
    CANCELLED: t("status.cancelled"),
    NO_SHOW: t("status.noShow"),
  };

  return (
    <>
      <AppPageHeader title={t("title")} />
      <main className="mx-auto max-w-2xl p-5">
        {bookings.length === 0 ? (
          <EmptyState message={t("empty")} exploreCta={t("exploreCta")} />
        ) : (
          <div className="flex flex-col gap-6">
            {upcoming.length > 0 && (
              <BookingGroup
                title={t("upcoming")}
                bookings={upcoming}
                locale={locale}
                statusLabels={statusLabels}
              />
            )}
            {past.length > 0 && (
              <BookingGroup
                title={t("past")}
                bookings={past}
                locale={locale}
                statusLabels={statusLabels}
              />
            )}
          </div>
        )}
      </main>
    </>
  );
}

type BookingItem = Awaited<ReturnType<typeof listBookingsForUser>>[number];

function EmptyState({
  message,
  exploreCta,
}: {
  message: string;
  exploreCta: string;
}) {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="bg-muted flex size-16 items-center justify-center rounded-full">
        <CalendarDays className="text-muted-foreground size-7" />
      </div>
      <p className="text-muted-foreground text-sm">{message}</p>
      <Link
        href="/"
        className="bg-primary text-primary-foreground rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
      >
        {exploreCta}
      </Link>
    </div>
  );
}

function BookingGroup({
  title,
  bookings,
  locale,
  statusLabels,
}: {
  title: string;
  bookings: BookingItem[];
  locale: string;
  statusLabels: Record<BookingStatus, string>;
}) {
  return (
    <section>
      <h2 className="text-muted-foreground mb-2 text-xs font-semibold uppercase">
        {title}
      </h2>
      <div className="flex flex-col gap-2">
        {bookings.map((booking) => {
          const price = new Intl.NumberFormat(locale, {
            style: "currency",
            currency: booking.currency,
          }).format(booking.priceInCents / 100);
          const date = new Intl.DateTimeFormat(locale, {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(booking.startAt);
          const CategoryIcon =
            CATEGORY_ICONS[booking.organization.category] ??
            CATEGORY_ICONS.OTHER;
          const status = BOOKING_STATUS_STYLE[booking.status];
          const StatusIcon = status.icon;

          return (
            <a
              key={booking.id}
              href={getTenantUrl(
                booking.organization.slug,
                "/account/bookings",
              )}
              className="border-border bg-card hover:border-primary/40 flex items-center gap-3 rounded-2xl border p-4 transition-colors"
            >
              <div className="bg-accent flex size-11 shrink-0 items-center justify-center rounded-full">
                <CategoryIcon className="text-accent-foreground size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold">
                  {booking.organization.name}
                </p>
                <p className="text-muted-foreground truncate text-sm">
                  {booking.service.name} · {booking.staff.displayName}
                </p>
                <p className="text-muted-foreground mt-0.5 text-xs">{date}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="text-sm font-medium">{price}</span>
                <span
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${status.className}`}
                >
                  <StatusIcon className="size-3" />
                  {statusLabels[booking.status]}
                </span>
              </div>
              <ChevronRight className="text-muted-foreground size-4 shrink-0" />
            </a>
          );
        })}
      </div>
    </section>
  );
}
