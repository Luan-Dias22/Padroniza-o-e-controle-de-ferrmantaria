import type {Metadata} from 'next';
import { Space_Grotesk, JetBrains_Mono, Inter } from 'next/font/google';
import './globals.css';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-sans', // we'll use this for headings
});

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-body', // use Inter for general body text
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Tool Manager - Padronização e Controle',
  description: 'Sistema de padronização e controle de ferramentaria',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="pt-BR" className={`dark ${spaceGrotesk.variable} ${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="font-body bg-[#050505] text-zinc-300 antialiased selection:bg-indigo-500/30" suppressHydrationWarning>{children}</body>
    </html>
  );
}
