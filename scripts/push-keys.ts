// Makes a new VAPID key pair for web push. Run once: `npm run push:keys`.
// The private key goes to a file rather than the screen, so it stays out of terminal history.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import * as webpush from "web-push";

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
const file = resolve(".env.push-keys.local");
writeFileSync(file, `VAPID_PRIVATE_KEY=${privateKey}\n`, { mode: 0o600 });

console.log(`Wrote the private key to ${file} (git ignores it).`);
console.log("Copy it into Vercel as VAPID_PRIVATE_KEY, then delete the file.\n");
console.log("The public key, for NEXT_PUBLIC_VAPID_PUBLIC_KEY (safe to share):\n");
console.log(publicKey);
