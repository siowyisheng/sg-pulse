// Starts `next dev` in demo mode. A script rather than `DEMO_MODE=1 next dev` in package.json,
// because that syntax only works in Unix shells, not in PowerShell or cmd on Windows.
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const next = createRequire(import.meta.url).resolve("next/dist/bin/next");
const child = spawn(process.execPath, [next, "dev", ...process.argv.slice(2)], {
  stdio: "inherit",
  env: { ...process.env, DEMO_MODE: "1" },
});

// Pass Ctrl+C on to the server, and exit with its exit code.
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("exit", (code, signal) => process.exit(signal ? 1 : (code ?? 0)));
