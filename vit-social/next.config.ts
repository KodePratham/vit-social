import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image-static.collegedunia.com",
        pathname: "/public/**",
      },
    ],
  },
};

initOpenNextCloudflareForDev();

export default nextConfig;
