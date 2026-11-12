import { parseSingpassPrivateJwks, publicJwksOf } from "@/core/jwks";

// Read the keys on every request, so a key change takes effect without a rebuild.
export const dynamic = "force-dynamic";

/**
 * Yah Lah's public keys, for Singpass. Public and read-only; Singpass caches it for about
 * an hour, so a short cache here is enough.
 */
export function GET() {
  return Response.json(publicJwksOf(parseSingpassPrivateJwks(process.env.SINGPASS_PRIVATE_JWKS)), {
    headers: { "cache-control": "public, max-age=300" },
  });
}
