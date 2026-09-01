declare module "cloudflare:workers" {
  export const env: {
    DB?: import("drizzle-orm/d1").DrizzleD1Database["$client"];
  };
}
