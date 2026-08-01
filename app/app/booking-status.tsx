import { Clock, CheckCircle2, XCircle, type LucideIcon } from "lucide-react";
import type { BookingStatus } from "@/generated/prisma/client";

export const BOOKING_STATUS_STYLE: Record<BookingStatus, { icon: LucideIcon; className: string; labelKey: string }> = {
  PENDING_PAYMENT: { icon: Clock, className: "text-amber-400 bg-amber-400/10", labelKey: "pendingPayment" },
  PENDING: { icon: Clock, className: "text-amber-400 bg-amber-400/10", labelKey: "pending" },
  CONFIRMED: { icon: CheckCircle2, className: "text-primary bg-primary/10", labelKey: "confirmed" },
  COMPLETED: { icon: CheckCircle2, className: "text-muted-foreground bg-muted", labelKey: "completed" },
  CANCELLED: { icon: XCircle, className: "text-destructive bg-destructive/10", labelKey: "cancelled" },
  NO_SHOW: { icon: XCircle, className: "text-destructive bg-destructive/10", labelKey: "noShow" },
};
