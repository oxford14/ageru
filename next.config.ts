import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Old reseller pages now live elsewhere; keep bookmarks working.
  async redirects() {
    return [
      { source: "/profile", destination: "/settings", permanent: false },
      { source: "/wallet", destination: "/settings", permanent: false },
      { source: "/transactions", destination: "/orders", permanent: false },
      { source: "/support", destination: "/settings", permanent: false },
      { source: "/admin/:path*", destination: "/dashboard", permanent: false },
    ];
  },
};

export default nextConfig;
