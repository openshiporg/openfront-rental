import { Fraunces } from 'next/font/google';

/**
 * Brand display face for customer surfaces only (wordmark and headings); the dashboard keeps Geist.
 * Fraunces' soft optical sizes read warm and settled at headline size and stay crisp in the 1.4rem wordmark.
 */
const display = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz', 'SOFT'],
  variable: '--font-stay-display',
  display: 'swap',
});

export const storefrontFontClass = display.variable;
