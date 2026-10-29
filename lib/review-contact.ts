// https://faq.whatsapp.com/5913398998672934
// https://faq.whatsapp.com/640432094208718
export function reviewWhatsAppUrl(phone?: string) {
  const raw = phone?.trim() || '';
  if (!/^\+?[\d\s().-]+$/.test(raw)) return null;
  let digits = raw.replace(/\D/g, '');
  const international = raw.startsWith('+') || digits.startsWith('00');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (international && !digits.startsWith('54')) return /^[1-9]\d{6,14}$/.test(digits) ? `https://wa.me/${digits}` : null;

  // Profiles commonly store Argentine numbers with an area code, without +54.
  if (digits.startsWith('54') && (international || digits.length >= 12)) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 11 && digits.startsWith('9')) digits = digits.slice(1);
  if (digits.length === 12) {
    const candidates = new Set<string>();
    for (let areaLength = 2; areaLength <= 4; areaLength++) {
      if (digits.slice(areaLength, areaLength + 2) === '15') candidates.add(digits.slice(0, areaLength) + digits.slice(areaLength + 2));
    }
    if (candidates.size !== 1) return null;
    digits = [...candidates][0];
  }
  return /^[1-9]\d{9}$/.test(digits) ? `https://wa.me/549${digits}` : null;
}
