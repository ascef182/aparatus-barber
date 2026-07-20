"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { getRootUrl } from "@/lib/tenant-host";
import { Button } from "@/app/_components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Input } from "@/app/_components/ui/input";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState(""); const [pending, setPending] = useState(false); const [sent, setSent] = useState(false); const [error, setError] = useState("");
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setPending(true); setError("");
    const result = await authClient.requestPasswordReset({ email, redirectTo: `${window.location.origin}/reset-password` });
    setPending(false);
    if (result.error) { console.error("password reset request failed", result.error); setError("Não foi possível solicitar o link agora. Tente novamente."); return; }
    setSent(true);
  }
  return <Card className="w-full max-w-md"><CardHeader><CardTitle>Redefinir senha</CardTitle></CardHeader><CardContent><form className="grid gap-4" onSubmit={submit}><p className="text-sm text-muted-foreground">Enviaremos um link para você criar uma nova senha.</p><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="E-mail" />{error && <p className="text-sm text-destructive" role="alert">{error}</p>}<Button disabled={pending}>{pending ? "Enviando..." : "Enviar link"}</Button>{sent && <p className="text-sm text-primary">Se houver uma conta com este e-mail, o link foi enviado.</p>}<Link className="text-center text-sm underline" href={getRootUrl("/sign-in")}>Voltar para entrar</Link></form></CardContent></Card>;
}
