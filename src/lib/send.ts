import { normalizePhone } from "./format";

export type Channel = "whatsapp" | "sms" | "email";

export interface SendPayload {
  /** WhatsApp-formatted text (may contain *bold*). */
  message: string;
  subject: string;
  phone: string;
  email: string;
  countryCode: string;
}

export const CHANNEL_LABEL: Record<Channel, string> = {
  whatsapp: "WhatsApp",
  sms: "SMS",
  email: "E-mail",
};

function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isIOS() {
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function plain(text: string) {
  return text.replace(/\*/g, "");
}

export function channelUrl(channel: Channel, p: SendPayload): string {
  const phone = normalizePhone(p.phone, p.countryCode);
  if (channel === "whatsapp") {
    const q = `${phone ? `phone=${phone}&` : ""}text=${encodeURIComponent(p.message)}`;
    // wa.me shows an interstitial page on desktop; these open the conversation directly.
    return isMobile() ? `whatsapp://send?${q}` : `https://web.whatsapp.com/send?${q}`;
  }
  if (channel === "sms") {
    const body = encodeURIComponent(plain(p.message));
    const to = phone ? `+${phone}` : "";
    return `sms:${to}${isIOS() ? "&" : "?"}body=${body}`;
  }
  const params = `subject=${encodeURIComponent(p.subject)}&body=${encodeURIComponent(plain(p.message))}`;
  return `mailto:${encodeURIComponent(p.email.trim())}?${params}`;
}

/** Must be called synchronously inside the click handler so the browser allows the redirect. */
export function openChannel(channel: Channel, p: SendPayload) {
  const url = channelUrl(channel, p);
  if (channel !== "whatsapp") {
    window.location.href = url;
    return;
  }
  if (isMobile()) {
    window.location.href = url;
    // If the WhatsApp app is not installed nothing happens: fall back to the web link.
    const timer = setTimeout(() => {
      if (document.visibilityState === "visible") {
        const phone = normalizePhone(p.phone, p.countryCode);
        window.location.href = `https://wa.me/${phone}?text=${encodeURIComponent(p.message)}`;
      }
    }, 1500);
    document.addEventListener("visibilitychange", () => clearTimeout(timer), { once: true });
    return;
  }
  const win = window.open(url, "whatsapp");
  if (!win) window.location.href = url;
}
