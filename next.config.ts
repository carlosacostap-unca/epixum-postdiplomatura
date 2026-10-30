import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server Function argument logs can contain identified or anonymous survey answers.
  logging: { serverFunctions: false },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin-allow-popups",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
