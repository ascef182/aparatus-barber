"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpRight, CalendarDays, CircleAlert, CircleCheck, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { getDashboardMetricsAction } from "@/app/_actions/get-dashboard-metrics";
import { POLL_INTERVAL_MS } from "@/lib/realtime";
import type { DashboardRange } from "@/lib/services/dashboard-metrics-service";
import { PageContainer, PageHeader } from "@/app/_components/ui/page";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/_components/ui/card";
import { cn } from "@/lib/utils";

type Metrics = Awaited<ReturnType<typeof import("@/lib/services/dashboard-metrics-service").getDashboardMetrics>>;

function money(value: number, locale: string, currency: string) { return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(value / 100); }

/** Variação vs. período anterior — omitido (não "0%"/"—") quando a base
 * anterior era zero, ver percentChange em dashboard-metrics-service.ts. */
function TrendBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  const positive = value >= 0;
  const Icon = positive ? ArrowUp : ArrowDown;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", positive ? "text-success" : "text-destructive")}>
      <Icon className="size-3" />
      {Math.abs(Math.round(value * 100))}%
    </span>
  );
}

function RevenueChart({ series, locale, currency }: { series: Metrics["series"]; locale: string; currency: string }) {
  const max = Math.max(1, ...series.flatMap((day) => [day.planned, day.received]));
  const points = (key: "planned" | "received") => series.map((day, index) => `${series.length === 1 ? 50 : (index / (series.length - 1)) * 100},${92 - (day[key] / max) * 78}`).join(" ");
  return <div className="mt-6" aria-label="Evolução de receita"><svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-52 w-full overflow-visible"><path d="M0 92H100" className="stroke-border" strokeWidth=".7" /><polyline points={points("planned")} fill="none" className="stroke-muted-foreground/50" strokeWidth="1.3" strokeDasharray="3 3" vectorEffect="non-scaling-stroke" /><polyline points={points("received")} fill="none" className="stroke-primary" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg><div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>{new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(`${series[0]?.date}T12:00:00`))}</span><span>{money(max, locale, currency)}</span><span>{new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(new Date(`${series.at(-1)?.date}T12:00:00`))}</span></div></div>;
}

export function DashboardOverview({ metrics: initialMetrics, role, locale, currency }: { metrics: Metrics; role: string; locale: string; currency: string }) {
  const t = useTranslations("dashboard.overview"); const financial = role === "owner";
  const rangeOptions: DashboardRange[] = [1, 7, 30, 90];
  const { data: metrics } = useQuery({
    queryKey: ["dashboard-metrics", initialMetrics.range],
    queryFn: async () => {
      const result = await getDashboardMetricsAction({ range: initialMetrics.range });
      if (!result?.data) throw new Error("failed to load dashboard metrics");
      return result.data;
    },
    initialData: initialMetrics,
    refetchInterval: POLL_INTERVAL_MS.overview,
  });
  const occupancyLabel = metrics.occupancyRate === null ? "—" : `${Math.round(metrics.occupancyRate * 100)}%`;
  const stats = financial ? [
    { label: t("received"), value: money(metrics.receivedRevenue, locale, currency), trend: metrics.trends.receivedRevenue },
    { label: t("avgTicket"), value: money(metrics.avgTicketInCents, locale, currency), trend: metrics.trends.avgTicketInCents },
    { label: t("newCustomers"), value: String(metrics.newCustomersCount), trend: metrics.trends.newCustomersCount },
    { label: t("completed"), value: String(metrics.completedCount), trend: metrics.trends.completedCount },
    { label: t("occupancy"), value: occupancyLabel, trend: metrics.trends.occupancyRate },
  ] : [
    { label: t("appointments"), value: String(metrics.bookingCount), trend: metrics.trends.bookingCount },
    { label: t("completed"), value: String(metrics.completedCount), trend: metrics.trends.completedCount },
    { label: t("noShows"), value: `${Math.round(metrics.noShowRate * 100)}%`, trend: null },
    { label: t("pendingPayments"), value: String(metrics.pendingPayments.length), trend: null },
    { label: t("occupancy"), value: occupancyLabel, trend: metrics.trends.occupancyRate },
  ];
  return (
    <PageContainer>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <PageHeader eyebrow={role === "owner" ? t("businessPulse") : t("operationsPulse")} title={t("title")} description={t(role === "owner" ? "ownerDescription" : "managerDescription")} />
        <div className="inline-flex w-fit shrink-0 rounded-lg border bg-card p-1">
          {rangeOptions.map((range) => (
            <Link key={range} href={`/dashboard?range=${range}`} className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${metrics.range === range ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
              {range === 1 ? t("today") : t("days", { count: range })}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="text-3xl font-semibold tracking-tight">{stat.value}</p>
              <TrendBadge value={stat.trend} />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(19rem,1fr)]">
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>{financial ? t("revenueEvolution") : t("dailyVolume")}</CardTitle>
              <CardDescription className="mt-1">{financial ? t("chartDescription") : t("dailyVolumeDescription")}</CardDescription>
            </div>
            <ArrowUpRight className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <RevenueChart series={metrics.series} locale={locale} currency={currency} />
            <div className="mt-5 flex gap-5 text-xs text-muted-foreground">
              <span className="flex items-center gap-2"><i className="size-2 rounded-full bg-primary" />{financial ? t("received") : t("appointments")}</span>
              <span className="flex items-center gap-2"><i className="size-2 rounded-full bg-muted-foreground/50" />{financial ? t("planned") : t("completed")}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>{t("teamPerformance")}</CardTitle>
              <CardDescription className="mt-1">{t("teamPerformanceDescription")}</CardDescription>
            </div>
            <Users className="size-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {metrics.topStaff.length ? metrics.topStaff.map((member, index) => (
                <li key={member.name} className="flex items-center gap-3">
                  <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">{index + 1}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{member.name}</span>
                  <span className="text-right text-xs text-muted-foreground"><b className="block text-sm text-foreground">{member.completed}</b>{t("completedShort")}</span>
                </li>
              )) : <li className="py-8 text-center text-sm text-muted-foreground">{t("noData")}</li>}
            </ol>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <CircleAlert className="size-5 text-warning" />
            <CardTitle>{t("attention")}</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.pendingPayments.length ? (
              <ul className="divide-y">
                {metrics.pendingPayments.slice(0, 4).map((booking) => (
                  <li className="flex items-center justify-between gap-3 py-3" key={booking.id}>
                    <span><b className="block text-sm">{booking.customer}</b><span className="text-xs text-muted-foreground">{booking.service}</span></span>
                    <Link href="/dashboard/agenda" className="text-sm font-medium text-primary hover:underline">{t("openAgenda")}</Link>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-muted-foreground">{t("allClear")}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex-row items-center gap-2 space-y-0">
            <CircleCheck className="size-5 text-primary" />
            <CardTitle>{t("nextStep")}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">{metrics.noShowCount ? t("noShowPrompt") : t("healthyPrompt")}</p>
            <Link href="/dashboard/agenda" className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
              <CalendarDays className="size-4" />{t("viewAgenda")}
            </Link>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
