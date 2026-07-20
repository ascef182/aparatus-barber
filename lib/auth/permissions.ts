import { createAccessControl } from "better-auth/plugins/access";
import {
  adminAc,
  defaultStatements,
  memberAc,
  ownerAc,
} from "better-auth/plugins/organization/access";

/**
 * Statements de permissão por recurso do domínio, mesclados aos statements
 * padrão do plugin organization (member/invitation/organization).
 * Ver plano de reestruturação, seção 5 (RBAC).
 */
export const statement = {
  ...defaultStatements,
  booking: ["create", "read", "read_own", "update", "cancel"],
  service: ["read", "manage"],
  staff: ["read", "manage"],
  location: ["read", "manage"],
  customer: ["read", "manage", "export"],
  settings: ["read", "manage"],
  billing: ["read", "manage"],
} as const;

export const ac = createAccessControl(statement);

/** Dono da barbearia: tudo, incluindo billing e exclusão da organização. */
export const owner = ac.newRole({
  ...ownerAc.statements,
  booking: ["create", "read", "read_own", "update", "cancel"],
  service: ["read", "manage"],
  staff: ["read", "manage"],
  location: ["read", "manage"],
  customer: ["read", "manage", "export"],
  settings: ["read", "manage"],
  billing: ["read", "manage"],
});

/** Gestão operacional: tudo exceto billing e exclusão da organização. */
export const manager = ac.newRole({
  ...adminAc.statements,
  booking: ["create", "read", "read_own", "update", "cancel"],
  service: ["read", "manage"],
  staff: ["read", "manage"],
  location: ["read", "manage"],
  customer: ["read", "manage", "export"],
  settings: ["read", "manage"],
  billing: ["read"],
});

/** Profissional: vê e gerencia apenas a própria agenda. */
export const professional = ac.newRole({
  ...memberAc.statements,
  booking: ["read_own", "update", "cancel"],
  service: ["read"],
  staff: ["read"],
  location: ["read"],
  customer: ["read"],
});

/** Recepção: agenda de todos e clientes, sem settings/billing/staff. */
export const receptionist = ac.newRole({
  ...memberAc.statements,
  booking: ["create", "read", "read_own", "update", "cancel"],
  service: ["read"],
  staff: ["read"],
  location: ["read"],
  customer: ["read", "manage"],
});

export const roles = { owner, manager, professional, receptionist };

export type AppRole = keyof typeof roles;

type Statements = typeof statement;
export type PermissionCheck = {
  [K in keyof Statements]?: Statements[K][number][];
};

export function isAppRole(role: string): role is AppRole {
  return role in roles;
}

export function hasPermission(role: string, check: PermissionCheck): boolean {
  if (!isAppRole(role)) return false;
  // Os roles são tipos genéricos distintos; a união não é chamável — usamos a
  // assinatura estrutural comum do authorize.
  const roleAc = roles[role] as unknown as {
    authorize: (check: PermissionCheck) => { success: boolean };
  };
  return roleAc.authorize(check).success;
}
