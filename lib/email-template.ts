/**
 * Casca HTML compartilhada por todo e-mail transacional (booking, convite,
 * reset de senha, verificação) — mesma identidade visual em todos, cores
 * inline (clientes de e-mail não confiam em <style>/CSS externo). Verde da
 * marca (#57AF78) é o mesmo usado nos gradientes decorativos da landing
 * page (equivalente sRGB de --primary em app/globals.css).
 */

const BRAND_GREEN = "#57AF78";
const INK = "#18181b";
const MUTED = "#71717a";
const BORDER = "#e4e4e7";
const BG = "#f4f4f5";

export interface BrandedEmailInput {
  preheader?: string;
  heading: string;
  paragraphs: string[];
  ctaLabel?: string;
  ctaUrl?: string;
  footerNote?: string;
}

export function renderBrandedEmail({
  preheader,
  heading,
  paragraphs,
  ctaLabel,
  ctaUrl,
  footerNote,
}: BrandedEmailInput): { html: string; text: string } {
  const safeHeading = escapeHtml(heading);
  const safePreheader = preheader ? escapeHtml(preheader) : undefined;
  const safeFooter = footerNote ? escapeHtml(footerNote) : "";
  const bodyHtml = paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${INK}">${escapeHtml(p).replace(/\n/g, "<br />")}</p>`,
    )
    .join("");

  const ctaHtml =
    ctaLabel && ctaUrl
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px">
          <tr><td style="border-radius:8px;background:${BRAND_GREEN}">
            <a href="${escapeHtmlAttribute(safeCtaUrl(ctaUrl))}" style="display:inline-block;padding:12px 24px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px">${escapeHtml(ctaLabel)}</a>
          </td></tr>
        </table>`
      : "";

  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeHeading}</title>
  </head>
  <body style="margin:0;padding:32px 16px;background:${BG};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
    ${safePreheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${safePreheader}</div>` : ""}
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid ${BORDER};border-radius:12px;overflow:hidden">
      <tr>
        <td style="padding:24px 32px;border-bottom:1px solid ${BORDER}">
          <span style="font-size:18px;font-weight:700;color:${INK};letter-spacing:-0.02em">Bladiq</span>
        </td>
      </tr>
      <tr>
        <td style="padding:32px">
          <h1 style="margin:0 0 16px;font-size:20px;font-weight:600;color:${INK}">${safeHeading}</h1>
          ${bodyHtml}
          ${ctaHtml}
        </td>
      </tr>
      <tr>
        <td style="padding:20px 32px;background:${BG};border-top:1px solid ${BORDER}">
          <p style="margin:0;font-size:12px;line-height:1.5;color:${MUTED}">${safeFooter}</p>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    heading,
    "",
    ...paragraphs,
    ctaLabel && ctaUrl ? `${ctaLabel}: ${safeCtaUrl(ctaUrl)}` : "",
    footerNote ?? "",
  ]
    .filter(Boolean)
    .join("\n\n");

  return { html, text };
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value).replace(/`/g, "&#96;");
}

function safeCtaUrl(value: string): string {
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("CTA URL must use http or https");
  }
  return url.toString();
}
