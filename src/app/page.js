'use client'

import { useState, useEffect } from 'react'
import ChatInput from '@/components/ChatInput'
import AudioPlayer from '@/components/AudioPlayer'
import ConversationHistory from '@/components/ConversationHistory'

export default function Home() {
  const [iniciado, setIniciado] = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('chat')) setIniciado(true)
  }, [])
  const [resposta, setResposta] = useState('')
  const [audioUrl, setAudioUrl] = useState(null)
  const [carregandoChat, setCarregandoChat] = useState(false)
  const [gerandoVoz, setGerandoVoz] = useState(false)
  const [falando, setFalando] = useState(false)
  const [erro, setErro] = useState('')
  const [recarregarHistorico, setRecarregarHistorico] = useState(0)
  const [textoFalar, setTextoFalar] = useState('')
  const [usandoVozClone, setUsandoVozClone] = useState(false)
  const [lingua, setLingua] = useState('pt-br')

  const linguas = [
    { code: 'pt-br', nome: 'Português (Brasil)' },
    { code: 'pt', nome: 'Português (Portugal)' },
    { code: 'en', nome: 'English' },
    { code: 'es', nome: 'Español' },
    { code: 'fr', nome: 'Français' },
    { code: 'de', nome: 'Deutsch' },
    { code: 'it', nome: 'Italiano' },
    { code: 'ja', nome: '日本語' },
    { code: 'zh-cn', nome: '简体中文' },
  ]

  async function handleEnviar(pergunta, materiais) {
    setErro('')
    setResposta('')
    setAudioUrl(null)
    setTextoFalar('')
    setFalando(false)
    setGerandoVoz(false)
    setUsandoVozClone(false)
    setCarregandoChat(true)

    try {
      let baseAlma = '', baseNegocio = ''
      let materiaisEnvio = materiais || { docs: [], skills: [], imagens: [] }
      if (typeof window !== 'undefined') {
        baseAlma = localStorage.getItem('base_conhecimento') || ''
        baseNegocio = localStorage.getItem('base_conhecimento_negocio') || ''
        if (!baseAlma) {
          try {
            const r = await fetch('/api/base-conhecimento?key=base_conhecimento')
            const d = await r.json()
            if (d.value) { baseAlma = d.value; localStorage.setItem('base_conhecimento', d.value) }
          } catch {}
        }
        if (!baseNegocio) {
          try {
            const r = await fetch('/api/base-conhecimento?key=base_conhecimento_negocio')
            const d = await r.json()
            if (d.value) { baseNegocio = d.value; localStorage.setItem('base_conhecimento_negocio', d.value) }
          } catch {}
        }
        if (!materiais) {
          const docs = JSON.parse(localStorage.getItem('materiais_docs') || '[]')
          const skills = JSON.parse(localStorage.getItem('materiais_skills') || '[]')
          const imgs = JSON.parse(localStorage.getItem('materiais_img') || '[]')
          if (!docs.length) {
            try {
              const r = await fetch('/api/base-conhecimento?key=materiais_docs')
              const d = await r.json()
              if (d.value) { materiaisEnvio.docs = JSON.parse(d.value); localStorage.setItem('materiais_docs', d.value) }
            } catch {}
          } else { materiaisEnvio.docs = docs }
          if (!skills.length) {
            try {
              const r = await fetch('/api/base-conhecimento?key=materiais_skills')
              const d = await r.json()
              if (d.value) { materiaisEnvio.skills = JSON.parse(d.value); localStorage.setItem('materiais_skills', d.value) }
            } catch {}
          } else { materiaisEnvio.skills = skills }
          if (!imgs.length) {
            try {
              const r = await fetch('/api/base-conhecimento?key=materiais_img')
              const d = await r.json()
              if (d.value) { materiaisEnvio.imagens = JSON.parse(d.value); localStorage.setItem('materiais_img', d.value) }
            } catch {}
          } else { materiaisEnvio.imagens = imgs }
        }
      }

      const chatRes = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pergunta,
          lingua,
          base_alma: baseAlma || undefined,
          base_negocio: baseNegocio || undefined,
          materiais: materiaisEnvio,
        }),
      })

      if (!chatRes.ok) {
        const errData = await chatRes.json()
        throw new Error(errData.erro || 'Erro ao obter resposta')
      }

      const { resposta: textoResposta } = await chatRes.json()
      setResposta(textoResposta)
      setCarregandoChat(false)

      setGerandoVoz(true)
      try {
        const ttsRes = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texto: textoResposta, lingua }),
        })

        if (ttsRes.ok) {
          const blob = await ttsRes.blob()
          const url = URL.createObjectURL(blob)
          setAudioUrl(url)
          setUsandoVozClone(true)
        } else {
          throw new Error('fallback')
        }
      } catch (_) {
        setTextoFalar(textoResposta)
        setFalando(true)
      }
      setGerandoVoz(false)

      fetch('/api/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta, resposta: textoResposta, lingua }),
      }).catch(() => {})

      setRecarregarHistorico((n) => n + 1)
    } catch (err) {
      setErro(err.message)
      setCarregandoChat(false)
      setGerandoVoz(false)
      setFalando(false)
    }
  }

  // === TELA DE ENTRADA ===
  if (!iniciado) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="text-center px-6">
          {/* Bolha 3D */}
          <div className="relative mx-auto mb-8 w-40 h-40 sm:w-52 sm:h-52">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-amber-300/30 via-white/10 to-transparent border border-white/30 shadow-[0_0_80px_rgba(251,191,36,0.15)] animate-float" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-white/20 via-transparent to-transparent backdrop-blur-xl border border-white/20 shadow-[inset_0_0_60px_rgba(251,191,36,0.08)]" />
            <div className="absolute inset-4 rounded-full bg-gradient-to-br from-white/10 via-amber-200/5 to-transparent backdrop-blur-lg" />
            <div className="absolute top-6 left-8 w-3 h-3 rounded-full bg-white/40 blur-[2px]" />
            <div className="absolute top-4 right-10 w-1.5 h-1.5 rounded-full bg-white/30 blur-[1px]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-14 h-14 sm:w-20 sm:h-20 text-amber-300/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2 drop-shadow-lg tracking-tight">
            Voz da Gente
          </h1>
          <p className="text-sm sm:text-base text-white/50 mb-10 max-w-xs mx-auto leading-relaxed">
            Assistente de voz com IA que responde na voz que você escolher
          </p>

          <button
            onClick={() => setIniciado(true)}
            className="group relative inline-flex items-center gap-2.5 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/30 px-8 py-3.5 text-white font-medium hover:bg-white/20 transition-all shadow-lg shadow-amber-500/5"
          >
            <span className="absolute inset-0 rounded-2xl bg-gradient-to-r from-amber-500/10 via-transparent to-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <span className="relative flex items-center gap-2.5">
              Entrar
              <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </span>
          </button>
        </div>
      </div>
    )
  }

  // === CHAT ===
  return (
    <div className="max-w-3xl mx-auto px-4 py-4 sm:py-6 space-y-4 sm:space-y-6">
      {/* Sair */}
      <button
        onClick={() => setIniciado(false)}
        className="inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 transition-colors"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Sair
      </button>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-white/40">Idioma:</span>
        <select
          value={lingua}
          onChange={(e) => setLingua(e.target.value)}
          className="rounded-lg bg-white/10 border border-white/20 px-2.5 py-1.5 text-xs text-white/70 focus:outline-none focus:border-amber-400/60 appearance-none cursor-pointer"
        >
          {linguas.map((l) => (
            <option key={l.code} value={l.code} className="bg-[#1a1a2e] text-amber-200">{l.nome}</option>
          ))}
        </select>
      </div>

      <section className="card-glass p-4 sm:p-6">
        <ChatInput onEnviar={handleEnviar} carregando={carregandoChat} />

        {carregandoChat && (
          <div className="mt-4 flex items-center gap-2 text-sm text-white/60 mensagem-entrada">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Pensando...
          </div>
        )}

        {resposta && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/10 backdrop-blur-md p-4 mensagem-entrada">
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-amber-400 mb-1">Resposta</p>
                <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
                  {resposta}
                </p>
              </div>
            </div>
          </div>
        )}

        {usandoVozClone && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="text-[11px] text-amber-300/80">Voz clonada ativada</span>
          </div>
        )}

        <div className="mt-3">
          <AudioPlayer
            texto={textoFalar}
            audioUrl={audioUrl}
            gerandoVoz={gerandoVoz}
            falando={falando}
            onStart={() => setFalando(true)}
            onEnd={() => setFalando(false)}
          />
        </div>

        {erro && (
          <div className="mt-3 rounded-2xl bg-rose-500/20 border border-rose-400/30 px-4 py-3 text-sm text-rose-200 flex items-center gap-2 mensagem-entrada backdrop-blur-sm">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {erro}
          </div>
        )}
      </section>

      <section className="card-glass p-4 sm:p-6">
        <ConversationHistory key={recarregarHistorico} />
      </section>
    </div>
  )
}
