import { describe, expect, it } from 'vitest';
import { reviewWhatsAppUrl } from './review-contact';

describe('contacto por WhatsApp desde las reservas', () => {
  it.each([
    '+54 9 383 400-0000', '5493834000000', '+54 (383) 400-0000', '0054 9 383 4000000',
    '3834000000', '(0383) 400-0000', '0383 15 4000000', '+54 383 15 4000000',
  ])('normaliza el formato argentino %s', phone => {
    expect(reviewWhatsAppUrl(phone)).toBe('https://wa.me/5493834000000');
  });
  it('admite código de área de dos y cuatro dígitos con prefijo local 15', () => {
    expect(reviewWhatsAppUrl('011 15 23456789')).toBe('https://wa.me/5491123456789');
    expect(reviewWhatsAppUrl('03835 15 123456')).toBe('https://wa.me/5493835123456');
  });
  it('conserva números internacionales explícitos de otros países', () => {
    expect(reviewWhatsAppUrl('+598 99 123 456')).toBe('https://wa.me/59899123456');
    expect(reviewWhatsAppUrl('0034 612 345 678')).toBe('https://wa.me/34612345678');
  });
  it.each([undefined, '', '4000000', '+54 38340000', '123', 'javascript:alert(1)', '3834000000 ext 1', '+1234567890123456'])('no genera un enlace con un teléfono incompleto o inválido: %s', phone => {
    expect(reviewWhatsAppUrl(phone)).toBeNull();
  });
});
