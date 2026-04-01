import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["snowflake-sdk", "pg"],
};

export default withWorkflow(nextConfig);
