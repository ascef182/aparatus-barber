"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { getRootUrl } from "@/lib/tenant-host";
import { Button } from "@/app/_components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Input } from "@/app/_components/ui/input";
export function ResetPasswordForm() { const query = useSearchParams(); const token = query.get("token") ?? ""; const [password, setPassword] = useState(""); const [confirm, setConfirm] = useState(""); const [error, setError] = useState(""); const [done, setDone] = useState(false); return <Card className="w-full max-w-md"><CardHeader><CardTitle>Nova senha</CardTitle></CardHeader><CardContent><form className="grid gap-3" onSubmit={async (e) => { e.preventDefault(); if (password.length < 8 || password !== confirm) { setError("Use ao menos 8 caracteres e confirme a mesma senha."); return; } const r = await authClient.resetPassword({ newPassword: password, token }); if (r.error) { setError(r.error.message ?? "Link inválido ou expirado."); return; } setDone(true); }}><Input type="password" placeholder="Nova senha" value={password} onChange={(e) => setPassword(e.target.value)} required /><Input type="password" placeholder="Confirmar nova senha" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />{error && <p className="text-sm text-destructive">{error}</p>}<Button>{done ? "Senha redefinida" : "Redefinir senha"}</Button>{done && <Link className="text-center text-sm underline" href={getRootUrl("/sign-in")}>Entrar</Link>}</form></CardContent></Card>; }
