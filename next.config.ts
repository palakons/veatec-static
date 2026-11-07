import type { NextConfig } from "next";
import { execSync } from "child_process";

let gitCommit = "dev";
let gitCommitDate = "";
try {
  gitCommit = execSync("git rev-parse --short HEAD").toString().trim();
  gitCommitDate = execSync('git log -1 --format="%cd" --date=format:"%d %b %H:%M"').toString().trim();
} catch {
  // fallback if git is unavailable
}

const nextConfig: NextConfig = {
  output: "export",
  basePath: "/veatec",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  env: {
    NEXT_PUBLIC_GIT_COMMIT: gitCommit,
    NEXT_PUBLIC_BUILD_TIME: gitCommitDate || new Date().toISOString(),
    NEXT_PUBLIC_BASE_PATH: "/veatec",
  },
};

export default nextConfig;
