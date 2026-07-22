"use client";

import { useState } from "react";
import { useAction } from "next-safe-action/hooks";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Button } from "@/app/_components/ui/button";
import { Input } from "@/app/_components/ui/input";
import { Label } from "@/app/_components/ui/label";
import { submitQuoteRequest } from "@/app/_actions/submit-quote-request";

/**
 * Formulário pra categorias sem horário fixo (ELECTRICIAN, CONSTRUCTION —
 * ver lib/business-category.ts): captura contato + descrição, sem seletor
 * de data/hora, no lugar da lista de serviços com Sheet de reserva.
 */
export function QuoteRequestForm({ locationId }: { locationId?: string }) {
  const t = useTranslations("booking.quoteRequest");
  const tBooking = useTranslations("booking");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);

  const action = useAction(submitQuoteRequest, {
    onSuccess: () => setSent(true),
    onError: ({ error }) => toast.error(error.serverError ?? t("error")),
  });

  if (sent) {
    return (
      <div className="rounded-2xl border p-6 text-center">
        <p className="text-lg font-semibold">{t("successTitle")}</p>
        <p className="mt-1 text-sm text-muted-foreground">{t("successBody")}</p>
      </div>
    );
  }

  const hasContact = Boolean(email.trim() || phone.trim());

  return (
    <form
      className="flex flex-col gap-3 rounded-2xl border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!hasContact) {
          toast.error(t("contactRequired"));
          return;
        }
        action.execute({
          locationId,
          customerName: name,
          customerEmail: email || undefined,
          customerPhone: phone || undefined,
          message,
        });
      }}
    >
      <div>
        <p className="text-lg font-bold">{t("title")}</p>
        <p className="text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="quote-name">{tBooking("namePlaceholder")}</Label>
        <Input id="quote-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="quote-email">{tBooking("emailPlaceholder")}</Label>
        <Input id="quote-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="quote-phone">{tBooking("phonePlaceholder")}</Label>
        <Input id="quote-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="quote-message">{t("messagePlaceholder")}</Label>
        <textarea
          id="quote-message"
          className="rounded-md border p-2 text-sm"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={10}
          rows={4}
        />
      </div>
      <Button type="submit" className="mt-1 rounded-full" disabled={action.isPending || !name || message.length < 10}>
        {action.isPending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
