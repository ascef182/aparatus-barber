import { db } from "@/lib/db";
import { requireTenantId } from "@/lib/tenant-context";
import {
  CURRENT_SETTINGS_VERSION,
  defaultRules,
  parseSettings,
  type ResolvedRules,
} from "@/lib/rules/schemas";

export type RulesScopeQuery = { locationId?: string; staffId?: string };

/**
 * Settings são append-only: cada mudança grava uma nova row (histórico
 * de auditoria grátis); a vigente é a mais recente do escopo.
 * Resolução por especificidade — cada nível é um override *completo* do
 * objeto de regras (sem merge campo a campo, consistente com o desenho
 * versionado): STAFF (se staffId) -> LOCATION (se locationId) -> ORGANIZATION
 * -> defaults.
 */
export async function getResolvedRules(query: RulesScopeQuery = {}): Promise<ResolvedRules> {
  if (query.staffId) {
    const staff = await findLatestSettings({ scope: "STAFF", scopeId: query.staffId });
    if (staff) return parseSettings(staff.version, staff.data);
  }
  if (query.locationId) {
    const location = await findLatestSettings({ scope: "LOCATION", scopeId: query.locationId });
    if (location) return parseSettings(location.version, location.data);
  }
  const organization = await findLatestSettings({ scope: "ORGANIZATION" });
  if (organization) return parseSettings(organization.version, organization.data);
  return defaultRules();
}

function findLatestSettings(where: { scope: "ORGANIZATION" | "LOCATION" | "STAFF"; scopeId?: string }) {
  return db.tenantSettings.findFirst({
    where,
    orderBy: { createdAt: "desc" },
  });
}

export function saveRules(
  data: ResolvedRules,
  createdBy: string,
  scope: { scope: "ORGANIZATION" | "LOCATION" | "STAFF"; scopeId?: string } = { scope: "ORGANIZATION" },
) {
  return db.tenantSettings.create({
    data: {
      organizationId: requireTenantId(),
      scope: scope.scope,
      scopeId: scope.scopeId,
      version: CURRENT_SETTINGS_VERSION,
      data,
      createdBy,
    },
  });
}
