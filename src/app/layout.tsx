import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SocialMind — Generator postów social media',
  description: 'AI-powered generator treści social media z Brand DNA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>{children}</body>
    </html>
  )
}
