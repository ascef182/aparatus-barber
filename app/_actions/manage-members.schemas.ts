import { z } from "zod";

// Ver manage-operations.schemas.ts: schemas ficam fora do arquivo "use
// server" porque esse tipo de arquivo só pode exportar async functions.
export const removeMemberSchema = z.object({ memberId: z.string() });
export const updateMemberRoleSchema = z.object({ memberId: z.string(), role: z.enum(["manager", "professional", "receptionist"]) });
