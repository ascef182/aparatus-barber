import { createAuthClient } from "better-auth/react"; // make sure to import from better-auth/react
import {
  adminClient,
  organizationClient,
  twoFactorClient,
} from "better-auth/client/plugins";
import { ac, roles } from "./auth/permissions";

export const authClient = createAuthClient({
  plugins: [
    organizationClient({ ac, roles }),
    adminClient(),
    twoFactorClient(),
  ],
});
