import type { Metadata } from 'next';
import '@fontsource/fredoka/latin-500.css';
import '@fontsource/nunito-sans/latin-400.css';
import '@fontsource/nunito-sans/latin-600.css';
import '@fontsource/nunito-sans/latin-700.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'ChogHop — The Last Lantern',
  description: 'A little mystery, a shared adventure. Step into the observatory and try the wallet-free Last Lantern practice expedition.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
