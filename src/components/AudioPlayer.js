'use client'

import { useState, useRef, useEffect } from 'react'

export default function AudioPlayer({ texto, audioUrl, gerandoVoz, falando, onStart, onEnd }) {
  // Se tem audioUrl, usa modo API (HTML5 audio). Se não, usa SpeechSynthesis.
  const usandoApi = !!audioUrl

  // --- Modo SpeechSynthesis (fallback) ---
  const [tocandoSS, setTocandoSS] = useState(false)
  const [pausadoSS, setPausadoSS] = useState(false)
  const [vozes, setVozes] = useState([])
  const [vozSelecionada, setVozSelecionada] = useState(null)
  const synthRef = useRef(null)

  // --- Modo API (HTML5 audio) ---
  const [tocandoAPI, setTocandoAPI] = useState(false)
  const audioRef = useRef(null)

  // Carrega vozes para fallback
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    synthRef.current = window.speechSynthesis

    function carregarVozes() {
      const todas = synthRef.current.getVoices()
      const roboticas = ['daniel', 'david', 'zira', 'desktop']
      const filtradas = todas.filter(
        (v) => !roboticas.some((r) => v.name.toLowerCase().includes(r))
      )
      const pt = filtradas.filter((v) => v.lang.startsWith('pt'))
      const ordenadas = [
        ...pt.filter((v) => /neural|natural|microsoft|google/i.test(v.name)),
        ...pt.filter((v) => !/neural|natural|microsoft|google/i.test(v.name)),
        ...filtradas.filter((v) => !v.lang.startsWith('pt')),
      ]
      const aptas = ordenadas.length > 0 ? ordenadas : todas
      setVozes(aptas)
      if (aptas.length > 0) {
        setVozSelecionada((a) => a || aptas[0].name)
      }
    }

    carregarVozes()
    if (synthRef.current.onvoiceschanged !== undefined) {
      synthRef.current.onvoiceschanged = carregarVozes
    }
  }, [])

  // Toca áudio da API automaticamente
  useEffect(() => {
    if (audioUrl && audioRef.current) {
      audioRef.current.src = audioUrl
      audioRef.current.load()
      audioRef.current.play().catch(() => {})
    }
  }, [audioUrl])

  // Atualiza estado do áudio API
  useEffect(() => {
    const el = audioRef.current
    if (!el || !usandoApi) return
    function onPlay() { setTocandoAPI(true); onStart?.() }
    function onPause() { setTocandoAPI(false) }
    function onEnd() { setTocandoAPI(false); onEnd?.() }
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnd)
    return () => {
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEnd)
    }
  }, [audioUrl, usandoApi])

  // SpeechSynthesis: fala quando recebe texto
  function falarSS(textoParaFalar, vozNome) {
    if (!synthRef.current || !textoParaFalar) return
    synthRef.current.cancel()
    const utterance = new SpeechSynthesisUtterance(textoParaFalar)
    utterance.lang = 'pt-BR'
    utterance.rate = 0.95
    const nome = vozNome || vozSelecionada
    if (nome) {
      const voz = vozes.find((v) => v.name === nome)
      if (voz) utterance.voice = voz
    }
    utterance.onstart = () => { setTocandoSS(true); setPausadoSS(false); onStart?.() }
    utterance.onend = () => { setTocandoSS(false); setPausadoSS(false); onEnd?.() }
    utterance.onerror = () => { setTocandoSS(false); setPausadoSS(false) }
    synthRef.current.speak(utterance)
  }

  useEffect(() => {
    if (!usandoApi && texto && falando) {
      falarSS(texto)
    }
  }, [texto, falando, usandoApi])

  useEffect(() => {
    return () => synthRef.current?.cancel()
  }, [])

  function togglePlayPause() {
    if (usandoApi) {
      if (!audioRef.current) return
      if (tocandoAPI) { audioRef.current.pause() } else { audioRef.current.play() }
      return
    }
    if (!synthRef.current) return
    if (tocandoSS && !pausadoSS) { synthRef.current.pause(); setPausadoSS(true) }
    else if (pausadoSS) { synthRef.current.resume(); setPausadoSS(false) }
    else if (texto) { falarSS(texto) }
  }

  function parar() {
    if (usandoApi) {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0 }
      setTocandoAPI(false)
      return
    }
    synthRef.current?.cancel()
    setTocandoSS(false); setPausadoSS(false)
  }

  function handleVoiceChange(e) {
    const novaVoz = e.target.value
    setVozSelecionada(novaVoz)
    if (tocandoSS && texto) {
      falarSS(texto, novaVoz)
      setTocandoSS(true)
    }
  }

  const tocando = usandoApi ? tocandoAPI : tocandoSS
  const pausado = usandoApi ? false : pausadoSS

  // --- Estados de carregamento ---
  if (gerandoVoz) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md px-4 py-3 flex items-center gap-3">
        <svg className="animate-pulse h-5 w-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
        <span className="text-sm text-white/60">Gerando voz...</span>
      </div>
    )
  }

  const semAudio = !texto && !audioUrl
  if (semAudio) return null

  return (
    <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md px-4 py-3">
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlayPause}
          className="flex-shrink-0 rounded-full bg-amber-500 p-2 text-white hover:bg-amber-600 transition-colors shadow-lg"
          aria-label={tocando ? 'Pausar' : 'Ouvir'}
        >
          {tocando ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/80">
              {usandoApi
                ? (tocando ? 'Reproduzindo áudio...' : 'Clique para ouvir')
                : (tocando && !pausado ? 'Reproduzindo...' : pausado ? 'Pausado' : 'Clique para ouvir')}
            </span>
            {tocando && (
              <span className="flex gap-0.5">
                <span className="w-0.5 h-3 bg-amber-400 rounded-full animate-pulse" />
                <span className="w-0.5 h-4 bg-amber-400 rounded-full animate-pulse delay-100" />
                <span className="w-0.5 h-2 bg-amber-400 rounded-full animate-pulse delay-200" />
              </span>
            )}
            {usandoApi && (
              <span className="text-[10px] text-amber-300/60">voz clonada</span>
            )}
          </div>

          {!usandoApi && vozes.length > 1 && (
            <div className="relative mt-1">
              <select
                value={vozSelecionada || ''}
                onChange={handleVoiceChange}
                className="appearance-none w-full max-w-[220px] text-xs text-white/80 bg-white/10 backdrop-blur-md rounded-lg px-3 py-1.5 pr-8 border border-white/20 focus:outline-none focus:border-amber-400/60 cursor-pointer transition-all hover:bg-white/15 shadow-lg"
              >
                {vozes.map((voz) => (
                  <option key={voz.name} value={voz.name} className="bg-gray-900 text-white/90">
                    {voz.name.replace(/Microsoft |Online |Natural|Neural/gi, '').trim()}
                    {' ('}{voz.lang.replace('pt-', '')})
                    {/neural|natural|microsoft|google/i.test(voz.name) ? ' ★' : ''}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                <svg className="w-3 h-3 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}
        </div>

        {(tocando || pausado) && (
          <button onClick={parar} className="text-white/40 hover:text-white/70 transition-colors" aria-label="Parar">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h12v12H6z" />
            </svg>
          </button>
        )}
      </div>

      {/* Audio element oculto para modo API */}
      <audio ref={audioRef} className="hidden" />
    </div>
  )
}
