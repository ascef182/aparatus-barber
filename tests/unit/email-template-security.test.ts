import { describe, expect, test } from "vitest";
import { renderBrandedEmail } from "@/lib/email-template";

describe("transactional email rendering", () => {
  test("escapes dynamic HTML while preserving the plain-text message", () => {
    const payload = `<img src=x onerror="alert(1)"><a href="https://evil.test">phishing</a>`;
    const email = renderBrandedEmail({
      preheader: payload,
      heading: payload,
      paragraphs: [payload],
      footerNote: payload,
    });

    expect(email.html).not.toContain("<img");
    expect(email.html).not.toContain('<a href="https://evil.test"');
    expect(email.html).toContain("&lt;img");
    expect(email.text).toContain(payload);
  });

  test("rejects non-http call-to-action protocols", () => {
    expect(() =>
      renderBrandedEmail({
        heading: "Security",
        paragraphs: ["Open the link"],
        ctaLabel: "Open",
        ctaUrl: "javascript:alert(1)",
      }),
    ).toThrow("CTA URL must use http or https");
  });
});
