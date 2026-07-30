/**
 * Gerador mínimo de arquivo .ics (RFC 5545) — só o suficiente pra um único
 * VEVENT de confirmação de reserva, anexado ao e-mail (ver
 * lib/notifications.ts). Sem dependência externa: o formato é texto simples
 * e o volume de campos usados aqui não justifica uma lib inteira.
 */

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

// Escapa vírgula, ponto-e-vírgula, barra invertida e quebra de linha —
// os únicos caracteres com significado especial em valores de texto do
// formato (RFC 5545 §3.3.11).
function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;")
    .replace(/\n/g, "\\n");
}

export function buildBookingIcs({
  uid,
  summary,
  description,
  location,
  startAt,
  endAt,
}: {
  uid: string;
  summary: string;
  description: string;
  location?: string;
  startAt: Date;
  endAt: Date;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Bladiq//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatIcsDate(new Date())}`,
    `DTSTART:${formatIcsDate(startAt)}`,
    `DTEND:${formatIcsDate(endAt)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    ...(location ? [`LOCATION:${escapeIcsText(location)}`] : []),
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  // CRLF é obrigatório pelo RFC — alguns clientes (Outlook) rejeitam LF puro.
  return lines.join("\r\n");
}
