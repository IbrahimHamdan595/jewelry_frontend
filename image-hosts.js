/**
 * Hosts product images are served from. Shared by next.config.js (image
 * optimizer allowlist) and src/lib/csp.ts (img-src), so the two can't drift.
 * CommonJS because next.config.js is loaded by plain Node.
 *
 * Only the R2 public bucket exists in stored data today (verified against the
 * DB backup). Override with IMAGE_HOSTS="a.example,b.example" if a custom
 * domain is put in front of the bucket.
 */
const DEFAULT_IMAGE_HOST = "pub-5092fdb36fa84b649893cd173e4339b7.r2.dev";

const IMAGE_HOSTS = (process.env.IMAGE_HOSTS || DEFAULT_IMAGE_HOST)
  .split(",")
  .map((h) => h.trim())
  .filter(Boolean);

module.exports = { IMAGE_HOSTS };
