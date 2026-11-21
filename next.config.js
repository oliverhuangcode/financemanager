/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  // Self-contained server in .next/standalone for the Docker image (Dokploy).
  output: "standalone",
};

export default config;
