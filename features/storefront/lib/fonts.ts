import { Newsreader } from 'next/font/google';

/** Editorial display face for customer surfaces only; the dashboard keeps Geist. */
const display = Newsreader({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz'],
  variable: '--font-stay-display',
  display: 'swap',
});

export const storefrontFontClass = display.variable;
