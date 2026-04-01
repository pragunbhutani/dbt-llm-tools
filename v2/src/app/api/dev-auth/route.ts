import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

const DEV_EMAIL = "admin@localhost.dev";
const DEV_PASSWORD = "admin";

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Not available" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Create the dev user if they don't exist yet.
  // If they already exist Supabase returns an error we can safely ignore.
  await admin.auth.admin.createUser({
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
    email_confirm: true,
  });

  return NextResponse.json({ email: DEV_EMAIL, password: DEV_PASSWORD });
}
