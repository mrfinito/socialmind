import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SocialMind — Generator postów social media',
  description: 'AI-powered generator treści social media z Brand DNA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <head>
        {/* No-flash theme init — runs before React hydration */}
        <script dangerouslySetInnerHTML={{
          __html: `
            (function(){
              try {
                var t = localStorage.getItem('sm:theme');
                if (t === 'light') document.documentElement.classList.add('preload-light');
              } catch(e){}
            })();
          `
        }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
