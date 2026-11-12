import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isDemoMode } from "@/demo-flag";
import { DEMO_PERSONAS } from "@/demo-personas";
import { FakeSingpassForm } from "./fake-singpass-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Fake Singpass · Yah Lah demo" };

/** The demo's stand-in for Singpass's login and consent page. Demo mode only. */
export default async function FakeSingpassPage({ searchParams }: { searchParams: Promise<{ state?: string | string[] }> }) {
  if (!isDemoMode()) notFound();
  const { state } = await searchParams;
  if (typeof state !== "string") notFound();
  return (
    <main className="page">
      <h1>Fake Singpass</h1>
      <p className="muted">This stands in for Singpass in the demo. Pick a made-up person or change their details, and Yah Lah receives their name, date of birth and sex, as it would from the real Singpass.</p>
      <FakeSingpassForm state={state} personas={DEMO_PERSONAS} />
    </main>
  );
}
