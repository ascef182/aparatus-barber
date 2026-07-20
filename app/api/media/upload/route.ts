import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getMembership } from "@/lib/services/member-service";
import { getOrganizationBySlug } from "@/lib/services/organization-service";
import { hasPermission } from "@/lib/auth/permissions";
import { resolveTenantSlug } from "@/lib/tenant-host";

const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  const requestHeaders = await headers();
  const session = await auth.api.getSession({ headers: requestHeaders });
  const slug = resolveTenantSlug(requestHeaders.get("host"));
  if (!session?.user || !slug) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const organization = await getOrganizationBySlug(slug); const membership = organization ? await getMembership(organization.id, session.user.id) : null;
  const form = await request.formData(); const file = form.get("file");
  const kind = form.get("kind") === "cover" ? "cover" : "service";
  const requiredPermission: Parameters<typeof hasPermission>[1] = kind === "cover" ? { settings: ["manage"] } : { service: ["manage"] };
  if (!organization || !membership || !hasPermission(membership.role, requiredPermission)) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME; const apiKey = process.env.CLOUDINARY_API_KEY; const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return NextResponse.json({ error: "Upload de imagens não está configurado." }, { status: 503 });
  if (!(file instanceof File) || !file.type.startsWith("image/") || file.size > MAX_BYTES) return NextResponse.json({ error: "Envie uma imagem de até 5 MB." }, { status: 400 });
  const folder = `aparatus/${organization.id}/${kind === "cover" ? "branding" : "services"}`; const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`).digest("hex");
  const upload = new FormData(); upload.set("file", file); upload.set("folder", folder); upload.set("timestamp", String(timestamp)); upload.set("api_key", apiKey); upload.set("signature", signature);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: "POST", body: upload });
  if (!response.ok) return NextResponse.json({ error: "O provedor de imagens recusou o envio." }, { status: 502 });
  const data = await response.json() as { secure_url: string; public_id: string };
  return NextResponse.json({ url: data.secure_url, publicId: data.public_id });
}
