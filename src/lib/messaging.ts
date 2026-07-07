import { formatCurrency } from "./utils";

/**
 * Free, click-to-send messaging. We build deep links that open WhatsApp / the
 * SMS app with a pre-filled message; the user taps send. No paid API, no DLT.
 */

// Normalise to digits with a default India (91) country code for wa.me.
export function normalizePhone(phone?: string) {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
}

export function reminderText(contactName: string, amount: number) {
  return (
    `Hi ${contactName}, gentle reminder: ${formatCurrency(amount)} is pending ` +
    `on your account. Please clear it at your convenience. Thank you! — FinTrack Pro`
  );
}

/** Share to a contact, or open the share picker when phone is omitted. */
export function whatsappLink(phone: string, text: string) {
  const num = normalizePhone(phone);
  const q = `?text=${encodeURIComponent(text)}`;
  if (!num) return `https://api.whatsapp.com/send${q}`;
  return `https://wa.me/${num}${q}`;
}

export function smsLink(phone: string, text: string) {
  const num = normalizePhone(phone);
  return `sms:${num ? `+${num}` : ""}?body=${encodeURIComponent(text)}`;
}
