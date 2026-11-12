/** Runs once when the server starts: configuration mistakes show here, not at someone's login. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.DEMO_MODE === "1") return;
  const { getSingpass } = await import("@/composition");
  try {
    getSingpass();
  } catch (error) {
    console.error(error);
    throw error;
  }
}
