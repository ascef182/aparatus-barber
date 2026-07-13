import { describe, expect, test } from "vitest";
import { hasPermission } from "@/lib/auth/permissions";

describe("RBAC — matriz de permissões por papel", () => {
  test("owner gerencia tudo, inclusive billing", () => {
    expect(hasPermission("owner", { billing: ["manage"] })).toBe(true);
    expect(hasPermission("owner", { settings: ["manage"] })).toBe(true);
    expect(hasPermission("owner", { booking: ["create", "cancel"] })).toBe(
      true,
    );
  });

  test("manager gerencia operação mas não billing", () => {
    expect(hasPermission("manager", { service: ["manage"] })).toBe(true);
    expect(hasPermission("manager", { staff: ["manage"] })).toBe(true);
    expect(hasPermission("manager", { billing: ["manage"] })).toBe(false);
    expect(hasPermission("manager", { billing: ["read"] })).toBe(true);
  });

  test("professional só vê a própria agenda", () => {
    expect(hasPermission("professional", { booking: ["read_own"] })).toBe(
      true,
    );
    expect(hasPermission("professional", { booking: ["read"] })).toBe(false);
    expect(hasPermission("professional", { service: ["manage"] })).toBe(false);
    expect(hasPermission("professional", { customer: ["export"] })).toBe(
      false,
    );
  });

  test("receptionist gerencia agenda e clientes, sem settings/staff", () => {
    expect(hasPermission("receptionist", { booking: ["create", "read"] })).toBe(
      true,
    );
    expect(hasPermission("receptionist", { customer: ["manage"] })).toBe(true);
    expect(hasPermission("receptionist", { settings: ["manage"] })).toBe(
      false,
    );
    expect(hasPermission("receptionist", { staff: ["manage"] })).toBe(false);
  });

  test("papel desconhecido nega tudo", () => {
    expect(hasPermission("hacker", { booking: ["read"] })).toBe(false);
    expect(hasPermission("", { booking: ["read"] })).toBe(false);
  });
});
