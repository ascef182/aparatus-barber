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
  const session = await auth.api.getSession({ headers: requestHeaders });
  const slug = resolveTenantSlug(requestHeaders.get("host"));
  if (!session?.user || !slug) return unauthorized();
  const organization = await getOrganizationBySlug(slug);
  const membership = organization
    ? await getMembership(organization.id, session.user.id)
    : null;
  const ip = await getClientIp();
  const { allowed } = await checkRateLimit(
    `media-upload:${ip}:${organization?.id ?? slug}`,
    {
      windowSeconds: 60 * 60,
      max: 20,
    },
  );
  if (!allowed) return tooManyRequests("Muitos uploads. Tente novamente mais tarde.");
  const form = await request.formData();
  const file = form.get("file");
  const kind = form.get("kind") === "cover" ? "cover" : "service";
  const requiredPermission: Parameters<typeof hasPermission>[1] =
    kind === "cover" ? { settings: ["manage"] } : { service: ["manage"] };
  if (
    !organization ||
    !membership ||
    !hasPermission(membership.role, requiredPermission)
  )
    return forbidden();
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
  const folder = `aparatus/${organization.id}/${kind === "cover" ? "branding" : "services"}`;
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = createHash("sha1")
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
  return NextResponse.json({ url: data.secure_url, publicId: data.public_id });
}
