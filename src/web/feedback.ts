import { feedbackSettings } from "@/composition";
import { isDemoMode } from "@/demo-flag";

/** Whether the site has feedback switched on: the owner's address, a Resend key and a sender are all set. The demo always has it, sending nowhere. */
export const feedbackIsOn = (): boolean => isDemoMode() || feedbackSettings() !== null;
