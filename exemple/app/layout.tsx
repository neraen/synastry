import type { Metadata } from 'next'
import { Manrope, Noto_Serif } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

const manrope = Manrope({ 
  subsets: ["latin"],
  variable: '--font-manrope'
});

const notoSerif = Noto_Serif({ 
  subsets: ["latin"],
  variable: '--font-noto-serif'
});

export const metadata: Metadata = {
  title: 'AstroMatch - Cosmic Connections',
  description: 'Discover your celestial compatibility',
  generator: 'v0.app',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${manrope.variable} ${notoSerif.variable} font-sans antialiased bg-surface text-on-surface`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
