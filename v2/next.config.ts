import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";
import { withEve } from "eve/next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["snowflake-sdk", "pg"],
};

export default withEve(withWorkflow(nextConfig));
