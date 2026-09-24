import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getMembership } from "@/lib/services/member-service";
import { getOrganizationBySlug } from "@/lib/services/organization-service";
import { hasPermission } from "@/lib/auth/permissions";
import { resolveTenantSlug } from "@/lib/tenant-host";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { badRequest, forbidden, tooManyRequests, unauthorized } from "@/lib/http-errors";
import { verifyBookingUploadToken } from "@/lib/booking-upload-token";
import { db } from "@/lib/db";
import { runWithTenant } from "@/lib/tenant-context";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

async function hasValidImageSignature(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes
    .slice(0, 8)
    .every(
      (value, index) =>
        value === [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a][index],
    );
  const webp =
    new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
    new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  return jpeg || png || webp;
}

export async function POST(request: Request) {
  const requestHeaders = await headers();
  const slug = resolveTenantSlug(requestHeaders.get("host"));
  if (!slug) return unauthorized();
  const organization = await getOrganizationBySlug(slug);
  if (!organization) return unauthorized();

  const ip = await getClientIp();
  const { allowed } = await checkRateLimit(`media-upload:${ip}:${organization.id}`, {
    windowSeconds: 60 * 60,
    max: 20,
  });
  if (!allowed) return tooManyRequests("Muitos uploads. Tente novamente mais tarde.");

  const form = await request.formData();
  const file = form.get("file");
  const kindRaw = form.get("kind");
  const kind = kindRaw === "cover" ? "cover" : kindRaw === "booking-reference" ? "booking-reference" : "service";

  let folder: string;
  if (kind === "booking-reference") {
    // Cliente final anônimo (agendamento público) -- sem sessão de staff.
    // Autorização vem do token assinado amarrado ao bookingId (ver
    // lib/booking-upload-token.ts), não de RBAC/membership.
    const bookingId = form.get("bookingId");
    const token = form.get("token");
    const expiresAt = Number(form.get("expiresAt"));
    if (typeof bookingId !== "string" || typeof token !== "string" || !bookingId || !token)
      return badRequest("Dados de upload inválidos.");
    if (!verifyBookingUploadToken(bookingId, expiresAt, token)) return unauthorized();
    const booking = await runWithTenant(organization.id, () =>
      db.booking.findUnique({ where: { id: bookingId }, select: { id: true } }),
    );
    // findUnique já é escopado por tenant (RLS + middleware) -- null aqui
    // cobre tanto "não existe" quanto "existe mas é de outra organização".
    if (!booking) return unauthorized();
    folder = `aparatus/${organization.id}/bookings/${bookingId}`;
  } else {
    const session = await auth.api.getSession({ headers: requestHeaders });
    const membership = session?.user
      ? await getMembership(organization.id, session.user.id)
      : null;
    const requiredPermission: Parameters<typeof hasPermission>[1] =
      kind === "cover" ? { settings: ["manage"] } : { service: ["manage"] };
    if (!membership || !hasPermission(membership.role, requiredPermission)) return forbidden();
    folder = `aparatus/${organization.id}/${kind === "cover" ? "branding" : "services"}`;
  }

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret)
    return NextResponse.json(
      { error: "Upload de imagens não está configurado." },
      { status: 503 },
    );
  if (
    !(file instanceof File) ||
    !ALLOWED_IMAGE_TYPES.has(file.type) ||
    file.size > MAX_BYTES ||
    !(await hasValidImageSignature(file))
  )
    return badRequest("Envie uma imagem JPEG, PNG ou WebP válida de até 5 MB.");
  const timestamp = Math.floor(Date.now() / 1000);
  // SHA-256, não o SHA-1 que é o default dos SDKs do Cloudinary: a assinatura
  // é uma construção secret-suffix (H(mensagem || segredo)), e colisão em
  // SHA-1 é prática hoje -- CodeQL sinaliza como js/weak-cryptographic-algorithm
  // high. A conta do Cloudinary aceita SHA-1 e SHA-256 por padrão, então a
  // troca não exige mudança no painel; só quebraria numa conta que tenha
  // pedido explicitamente SHA-1 exclusivo.
  const signature = createHash("sha256")
    .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");
  const upload = new FormData();
  upload.set("file", file);
  upload.set("folder", folder);
  upload.set("timestamp", String(timestamp));
  upload.set("api_key", apiKey);
  upload.set("signature", signature);
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: upload },
  );
  if (!response.ok)
    return NextResponse.json(
      { error: "O provedor de imagens recusou o envio." },
      { status: 502 },
    );
  const data = (await response.json()) as {
    secure_url: string;
    public_id: string;
  };
  const uploadedUrl = new URL(data.secure_url);
  if (
    uploadedUrl.protocol !== "https:" ||
    uploadedUrl.hostname !== "res.cloudinary.com" ||
    !uploadedUrl.pathname.startsWith(`/${cloudName}/`)
  ) {
    return NextResponse.json(
      { error: "Resposta inválida do provedor de imagens." },
      { status: 502 },
    );
  }
  if (kind === "booking-reference") {
    const bookingId = form.get("bookingId") as string;
    await runWithTenant(organization.id, () =>
      db.bookingAttachment.create({
        data: { bookingId, organizationId: organization.id, url: data.secure_url, publicId: data.public_id },
      }),
    );
  }
  return NextResponse.json({ url: data.secure_url, publicId: data.public_id });
}
