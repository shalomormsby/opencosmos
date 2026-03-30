/**
 * Font Loader
 * Loads fonts using design-system configurations
 */

import { Inter, Manrope, Instrument_Sans, Lora, JetBrains_Mono, Space_Grotesk, Fira_Code } from 'next/font/google';

/**
 * Studio Theme Fonts
 * Variable names from @opencosmos/ui
 */
export const studioHeading = Inter({
  subsets: ['latin'],
  variable: '--font-studio-heading',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const studioBody = Manrope({
  subsets: ['latin'],
  variable: '--font-studio-body',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const studioMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-studio-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
});

/**
 * Terra Theme Fonts
 */
export const terraSans = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-terra-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const terraSerif = Lora({
  subsets: ['latin'],
  variable: '--font-terra-serif',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  style: ['normal', 'italic'],
});

export const terraMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-terra-mono',
  display: 'swap',
  weight: ['400', '500', '600'],
});

/**
 * Volt Theme Fonts
 */
export const voltSans = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-volt-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const voltMono = Fira_Code({
  subsets: ['latin'],
  variable: '--font-volt-mono',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

/**
 * All font variables combined
 * Apply to root HTML element className
 */
export const allFontVariables = [
  studioHeading.variable,
  studioBody.variable,
  studioMono.variable,
  terraSans.variable,
  terraSerif.variable,
  terraMono.variable,
  voltSans.variable,
  voltMono.variable,
].join(' ');
