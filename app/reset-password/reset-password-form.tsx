"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { authClient } from "@/lib/auth-client";
import { getRootUrl } from "@/lib/tenant-host";
import { Button } from "@/app/_components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Input } from "@/app/_components/ui/input";

export function ResetPasswordForm() {
  const t = useTranslations("resetPassword");
  const query = useSearchParams();
  const token = query.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < 8 || password !== confirm) {
      setError(t("validationError"));
      return;
    }
    const result = await authClient.resetPassword({ newPassword: password, token });
    if (result.error) {
      setError(result.error.message ?? t("invalidOrExpiredLink"));
      return;
    }
    setDone(true);
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="grid gap-3" onSubmit={submit}>
          <Input type="password" placeholder={t("newPasswordPlaceholder")} value={password} onChange={(e) => setPassword(e.target.value)} required />
          <Input type="password" placeholder={t("confirmPasswordPlaceholder")} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button>{done ? t("done") : t("submit")}</Button>
          {done && <Link className="text-center text-sm underline" href={getRootUrl("/sign-in")}>{t("signInLink")}</Link>}
        </form>
      </CardContent>
    </Card>
  );
}
