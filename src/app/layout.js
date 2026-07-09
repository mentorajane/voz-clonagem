import './globals.css'

export const metadata = {
  title: 'Voz da Gente — Assistente de Voz com IA',
  description: 'Faça perguntas e ouça as respostas na voz de quem você admira.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-icon.svg',
  },
  appleWebApp: {
    capable: true,
    title: 'Voz da Gente',
    statusBarStyle: 'black-translucent',
  },
}

export const viewport = {
  themeColor: '#0f0f1a',
}

const VIDEO_URL = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_080021_d598092b-c4c2-4e53-8e46-94cf9064cd50.mp4'

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen flex flex-col relative">
        {/* Video de fundo */}
        <video
          className="video-bg"
          autoPlay
          loop
          muted
          playsInline
        >
          <source src={VIDEO_URL} type="video/mp4" />
        </video>
        <div className="video-overlay" />

        {/* Header */}
        <header className="header-glass sticky top-0 z-10">
          <div className="max-w-3xl mx-auto px-4 py-3 sm:py-4 flex items-center gap-3">
            <a href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-300/20 to-yellow-500/10 backdrop-blur-md border border-amber-300/30 flex items-center justify-center flex-shrink-0 shadow-lg shadow-amber-500/20">
                <svg className="w-5 h-5 text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white drop-shadow-sm">Voz da Gente</h1>
                <p className="text-xs text-white/70">Assistente de Voz com IA</p>
              </div>
            </a>
            <nav className="ml-auto flex items-center gap-2">
              <a
                href="/clone"
                className="group relative rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 px-4 py-2 text-xs text-white/80 hover:text-white transition-all flex items-center gap-1.5 shadow-[0_0_20px_rgba(251,191,36,0.08)] hover:shadow-[0_0_30px_rgba(251,191,36,0.2)] hover:bg-white/15 hover:border-amber-400/30"
              >
                <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500/10 via-transparent to-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                <svg className="w-3.5 h-3.5 relative text-amber-300 drop-shadow-[0_0_4px_rgba(251,191,36,0.3)] group-hover:drop-shadow-[0_0_8px_rgba(251,191,36,0.5)] transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="relative">Configurar Voz</span>
              </a>
            </nav>
          </div>
        </header>

        {/* Conteúdo */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <footer className="footer-glass py-3">
          <p className="text-xs text-white/50 text-center">
            IA: Groq &middot; Voz: Fish Audio
          </p>
        </footer>

        <script dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js')
            }
          `
        }} />
      </body>
    </html>
  )
}
