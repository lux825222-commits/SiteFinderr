import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { accountEmail, canonicalUsername, matchesInitialCredential } from "./accounts";

/**
 * Creates one of the 300 predefined client accounts on its first login.
 * Only runs when the login is @Cliente1…@Cliente300 AND the password is the initial one.
 * Existing accounts are never modified, so a changed password stays changed.
 */
export const provisionClientAccount = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ username: z.string().max(40), password: z.string().max(100) }).parse(input),
  )
  .handler(async ({ data }) => {
    const n = matchesInitialCredential(data.username, data.password);
    if (n === null) return { ok: false as const };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: accountEmail(n),
      password: canonicalUsername(n),
      email_confirm: true,
      user_metadata: { username: canonicalUsername(n) },
    });
    if (error) {
      const exists = error.code === "email_exists" || /already|registered|exists/i.test(error.message);
      if (!exists) {
        console.error("provisionClientAccount failed", error);
        return { ok: false as const };
      }
    }
    return { ok: true as const };
  });
