"use client";

import { isSameDay, isToday, isYesterday, format } from "date-fns";
import { enUS, pt, de } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/app/_components/ui/avatar";
import { cn } from "@/lib/utils";

export type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  fromSelf: boolean;
};

type ChatLabels = {
  today: string;
  yesterday: string;
  sent: string;
  read: string;
};

const DATE_FNS_LOCALES = { en: enUS, pt, de } as const;

// Mensagens consecutivas do mesmo lado, dentro dessa janela, ficam
// agrupadas (colam, sem repetir avatar) — mesmo padrão WhatsApp/iMessage.
const GROUP_GAP_MS = 5 * 60 * 1000;

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function dayDividerLabel(date: Date, locale: "en" | "pt" | "de", labels: ChatLabels): string {
  if (isToday(date)) return labels.today;
  if (isYesterday(date)) return labels.yesterday;
  return format(date, "d MMM", { locale: DATE_FNS_LOCALES[locale] });
}

export function ChatThread({
  messages,
  otherPartyName,
  otherPartyImage,
  otherPartyReadAt,
  locale,
  labels,
  emptyLabel,
}: {
  messages: ChatMessage[];
  otherPartyName: string;
  otherPartyImage?: string | null;
  otherPartyReadAt: string | null;
  locale: "en" | "pt" | "de";
  labels: ChatLabels;
  emptyLabel?: string;
}) {
  if (messages.length === 0) {
    return emptyLabel ? <p className="text-sm text-muted-foreground">{emptyLabel}</p> : null;
  }

  const otherPartyReadAtMs = otherPartyReadAt ? new Date(otherPartyReadAt).getTime() : null;

  return (
    <>
      {messages.map((message, index) => {
        const date = new Date(message.createdAt);
        const previous = messages[index - 1];
        const next = messages[index + 1];
        const previousDate = previous ? new Date(previous.createdAt) : null;
        const nextDate = next ? new Date(next.createdAt) : null;

        const showDivider = !previousDate || !isSameDay(date, previousDate);
        const grouped =
          !!previous &&
          !showDivider &&
          previous.fromSelf === message.fromSelf &&
          date.getTime() - previousDate!.getTime() < GROUP_GAP_MS;
        const isLastOfGroup =
          !next ||
          next.fromSelf !== message.fromSelf ||
          !isSameDay(date, nextDate!) ||
          nextDate!.getTime() - date.getTime() >= GROUP_GAP_MS;

        const read = message.fromSelf && otherPartyReadAtMs !== null && otherPartyReadAtMs >= date.getTime();

        return (
          <div key={message.id}>
            {showDivider && (
              <div className="my-3 flex justify-center">
                <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                  {dayDividerLabel(date, locale, labels)}
                </span>
              </div>
            )}
            <div className={cn("flex items-end gap-2", message.fromSelf ? "justify-end" : "justify-start", grouped ? "mt-0.5" : "mt-2")}>
              {!message.fromSelf &&
                (isLastOfGroup ? (
                  <Avatar className="size-7">
                    {otherPartyImage && <AvatarImage src={otherPartyImage} alt={otherPartyName} />}
                    <AvatarFallback className="text-[10px]">{initials(otherPartyName)}</AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="size-7 shrink-0" />
                ))}
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-3 py-2 text-sm",
                  message.fromSelf ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
                  isLastOfGroup && (message.fromSelf ? "rounded-br-md" : "rounded-bl-md"),
                )}
              >
                <p className="whitespace-pre-wrap break-words">{message.body}</p>
                <div
                  className={cn(
                    "mt-1 flex items-center justify-end gap-1 text-[10px]",
                    message.fromSelf ? "text-primary-foreground/70" : "text-muted-foreground",
                  )}
                >
                  <span>{format(date, "HH:mm")}</span>
                  {message.fromSelf && (
                    <span className={read ? "text-sky-300" : undefined} aria-label={read ? labels.read : labels.sent}>
                      {read ? "✓✓" : "✓"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
