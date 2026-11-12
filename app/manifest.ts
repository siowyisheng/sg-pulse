import type { MetadataRoute } from "next";
import { colors } from "@/theme/tokens";

/** Makes Yah Lah installable to the home screen (which iPhone web push also needs). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Yah Lah",
    short_name: "Yah Lah",
    description: "How's Singapore feeling today? One Good and one Bad Feeling a day.",
    start_url: "/",
    display: "standalone",
    background_color: colors.light.background,
    theme_color: colors.light.primary,
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
