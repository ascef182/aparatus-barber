"use server";

import { staffActionClient } from "@/lib/safe-action";
import { listConversationsForStaff } from "@/lib/services/conversation-service";

export const listStaffConversationsAction = staffActionClient({
  messages: ["read"],
}).action(async () => {
  return listConversationsForStaff();
});
