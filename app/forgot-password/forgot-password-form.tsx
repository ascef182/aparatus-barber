"use client";

import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { getRootUrl } from "@/lib/tenant-host";
import { Button } from "@/app/_components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Input } from "@/app/_components/ui/input";

export function ForgotPasswordForm() {
  const t = useTranslations("forgotPassword");
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await authClient.requestPasswordReset({ email, redirectTo: `${window.location.origin}/reset-password` });
    setPending(false);
    if (result.error) {
      console.error("password reset request failed", result.error);
      setError(t("genericError"));
      return;
    }
    setSent(true);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-4" onSubmit={submit}>
          <p className="text-sm text-muted-foreground">{t("body")}</p>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder={t("emailPlaceholder")} />
          {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
          <Button disabled={pending}>{pending ? t("sending") : t("submit")}</Button>
          {sent && <p className="text-sm text-primary">{t("sent")}</p>}
          <Link className="text-center text-sm underline" href={getRootUrl("/sign-in")}>{t("backToSignIn")}</Link>
        </form>
      </CardContent>
    </Card>
  );
}
