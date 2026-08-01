import Link from "next/link";
import { User } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/app/_components/ui/button";

/**
 * Entrar/Minha conta flutuante no canto oposto ao BackButton (mesmo padrão
 * de posicionamento — funciona igual nos dois headers, com ou sem capa).
 * Única fonte de navegabilidade pra área de conta a partir da landing
 * pública, que antes não linkava pra lugar nenhum. "/account" resolve os
 * dois casos sozinho: o layout protegido já redireciona pro sign-in quando
 * não há sessão, então não precisa de dois hrefs diferentes aqui.
 */
export async function TenantNav({ customerName }: { customerName: string | null }) {
  const t = await getTranslations("tenant.nav");

  return (
    <Button asChild size="sm" variant="secondary" className="absolute top-4 right-4 z-10 rounded-full">
      <Link href="/account">
        <User className="size-4" />
        {customerName ? customerName.split(" ")[0] : t("signIn")}
      </Link>
    </Button>
  );
}
