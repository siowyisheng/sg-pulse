/** True when running the local demo (`npm run demo`). Kept apart from src/demo.ts so checking it never loads the demo itself. */
export const isDemoMode = () => process.env.DEMO_MODE === "1";
