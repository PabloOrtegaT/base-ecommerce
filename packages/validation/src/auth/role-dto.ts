import { z } from "zod";
import { roleSchema } from "@cannaculture/domain";

export const createRoleAssignmentInputSchema = z.object({
  userId: z.string().uuid(),
  role: roleSchema,
});
export type CreateRoleAssignmentInput = z.infer<typeof createRoleAssignmentInputSchema>;

export const updateRoleAssignmentInputSchema = z.object({
  assignmentId: z.string().uuid(),
  role: roleSchema,
});
export type UpdateRoleAssignmentInput = z.infer<typeof updateRoleAssignmentInputSchema>;
