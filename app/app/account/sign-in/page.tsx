import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { BackButton } from "@/app/t/[slug]/back-button";
import { AppSignInForm } from "./app-sign-in-form";

export default async function CustomerAppSignInPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) redirect("/account");

  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <BackButton />
      <span className="text-lg font-bold tracking-tight">Bladiq</span>
      <AppSignInForm />
    </main>
  );
}
