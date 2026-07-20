import { describe, expect, it } from "vitest";
import { parseManagedSlugs, renderHosts, rootHostname } from "@/scripts/dev-hosts";

const ROOT = "lvh.me";
const BEGIN = "# >>> aparatus dev hosts (managed by scripts/dev-hosts.ts) >>>";
const END = "# <<< aparatus dev hosts <<<";

const BASE = "# Copyright (c) 1993-2009 Microsoft Corp.\r\n#\t127.0.0.1       localhost\r\n";

describe("rootHostname", () => {
  it("remove a porta do NEXT_PUBLIC_ROOT_DOMAIN", () => {
    expect(rootHostname("lvh.me:3000")).toBe("lvh.me");
    expect(rootHostname("aparatus.app")).toBe("aparatus.app");
    expect(rootHostname("LVH.ME:3000")).toBe("lvh.me");
  });
});

describe("renderHosts / parseManagedSlugs", () => {
  it("cria o bloco com root + slugs ordenados e sem duplicatas", () => {
    const out = renderHosts(BASE, ROOT, ["demo", "abc", "demo"]);
    expect(parseManagedSlugs(out, ROOT)).toEqual(["abc", "demo"]);
    expect(out).toContain(`127.0.0.1 ${ROOT}`);
    expect(out.indexOf(`127.0.0.1 abc.${ROOT}`)).toBeLessThan(out.indexOf(`127.0.0.1 demo.${ROOT}`));
    // Preserva o conteúdo original fora do bloco.
    expect(out).toContain("#\t127.0.0.1       localhost");
  });

  it("é idempotente: re-renderizar com os mesmos slugs não muda nada", () => {
    const once = renderHosts(BASE, ROOT, ["demo"]);
    const twice = renderHosts(once, ROOT, ["demo"]);
    expect(twice).toBe(once);
  });

  it("substitui o bloco existente em vez de duplicar", () => {
    const withDemo = renderHosts(BASE, ROOT, ["demo"]);
    const withBoth = renderHosts(withDemo, ROOT, ["demo", "other"]);
    expect(withBoth.split(BEGIN).length - 1).toBe(1);
    expect(withBoth.split(END).length - 1).toBe(1);
    expect(parseManagedSlugs(withBoth, ROOT)).toEqual(["demo", "other"]);
  });

  it("remove slugs mantendo o bloco (root continua resolvendo)", () => {
    const withBoth = renderHosts(BASE, ROOT, ["demo", "other"]);
    const removed = renderHosts(withBoth, ROOT, ["other"]);
    expect(parseManagedSlugs(removed, ROOT)).toEqual(["other"]);
    expect(removed).toContain(`127.0.0.1 ${ROOT}`);
    expect(removed).not.toContain(`demo.${ROOT}`);
  });

  it("slugs === null remove o bloco inteiro", () => {
    const withDemo = renderHosts(BASE, ROOT, ["demo"]);
    const cleaned = renderHosts(withDemo, ROOT, null);
    expect(cleaned).not.toContain(BEGIN);
    expect(cleaned).not.toContain(END);
    expect(cleaned).not.toContain("lvh.me");
    expect(cleaned).toContain("#\t127.0.0.1       localhost");
  });

  it("preserva o line ending do arquivo (CRLF do Windows)", () => {
    const out = renderHosts(BASE, ROOT, ["demo"]);
    expect(out).toContain("\r\n");
    expect(out.replace(/\r\n/g, "")).not.toContain("\n");
  });

  it("recupera bloco truncado (BEGIN sem END) descartando até o EOF", () => {
    const corrupted = `${BASE}\r\n${BEGIN}\r\n127.0.0.1 stale.${ROOT}\r\n`;
    const out = renderHosts(corrupted, ROOT, ["demo"]);
    expect(parseManagedSlugs(out, ROOT)).toEqual(["demo"]);
    expect(out).not.toContain(`stale.${ROOT}`);
    expect(out.split(BEGIN).length - 1).toBe(1);
  });

  it("parseManagedSlugs ignora arquivo sem bloco", () => {
    expect(parseManagedSlugs(BASE, ROOT)).toEqual([]);
  });
});
