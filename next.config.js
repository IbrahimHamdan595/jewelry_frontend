/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
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
