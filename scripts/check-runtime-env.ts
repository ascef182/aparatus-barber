import "dotenv/config";
import { assertRuntimeEnv } from "@/lib/env";

assertRuntimeEnv("web", true);
