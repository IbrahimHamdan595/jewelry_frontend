const { IMAGE_HOSTS } = require("./image-hosts.js");

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Only the hosts product photos actually live on. A wildcard here made
    // /_next/image an open proxy: anyone could have this deployment fetch,
    // optimise, cache and serve any URL on the internet (NEX-55).
    remotePatterns: IMAGE_HOSTS.map((hostname) => ({ protocol: "https", hostname })),
  },
  /**
   * Static security headers for every response. The Content-Security-Policy
   * itself is set by the middleware, because it carries a per-request nonce.
   */
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // Legacy anti-framing; frame-ancestors 'none' in the CSP is the modern one.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  /**
   * Proxy the API through this origin. The backend sets its session cookie as
   * HttpOnly on whatever host the browser talked to; routed through here, that
   * is THIS host, so the middleware can read the cookie and no page script can
   * (NEX-59). BACKEND_API_URL is server-only and includes the backend's /api
   * prefix, e.g. https://api.example.com/api.
   */
  async rewrites() {
    const backend = (process.env.BACKEND_API_URL || "http://localhost:8001/api").replace(/\/$/, "");
    return [{ source: "/api/:path*", destination: `${backend}/:path*` }];
  },
};

module.exports = nextConfig;
