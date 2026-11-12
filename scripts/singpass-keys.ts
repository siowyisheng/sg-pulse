// Makes a new Singpass signing and encryption key pair.
// Run once per environment (staging and production each get their own): `npm run singpass:keys`.
// The private keys go to a file rather than the screen, so they stay out of terminal history.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateSingpassKeys } from "../src/core/jwks";

const { privateJwks, publicJwks } = generateSingpassKeys(new Date());
const file = resolve(".env.singpass-keys.local");
writeFileSync(file, `SINGPASS_PRIVATE_JWKS='${JSON.stringify(privateJwks)}'\n`, { mode: 0o600 });

console.log(`Wrote the private keys to ${file} (git ignores it).`);
console.log("Copy the value after SINGPASS_PRIVATE_JWKS= (without the quotes) into Vercel, then delete the file.\n");
console.log("The public key set it publishes at /.well-known/jwks.json (safe to share):\n");
console.log(JSON.stringify(publicJwks, null, 2));
