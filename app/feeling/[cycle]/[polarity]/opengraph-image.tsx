import { ImageResponse } from "next/og";
import { notFound } from "next/navigation";
import { getApp } from "@/composition";
import { SHARE_CARD_SIZE, ShareCard } from "@/theme/share-card";
import { polarityFrom } from "@/web/polarity";
import { currentAppName } from "@/web/app-name";

export const alt = "A Feeling of the Day";
export const size = SHARE_CARD_SIZE;
export const contentType = "image/png";

/** The share preview: drawn from the text, Hashtag and Polarity alone. */
export default async function Image({ params }: { params: Promise<{ cycle: string; polarity: string }> }) {
  const { cycle, polarity } = await params;
  const known = polarityFrom(polarity);
  const preview = known ? await (await getApp()).sharePreview(cycle, known) : null;
  if (!preview) notFound();
  return new ImageResponse(<ShareCard preview={preview} appName={await currentAppName()} />, size);
}
