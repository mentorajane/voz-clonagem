'use client'

import { useState, useEffect, useRef } from 'react'

export default function ConversationHistory() {
  const [conversas, setConversas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [copiadoId, setCopiadoId] = useState(null)
  const [compartilhadoId, setCompartilhadoId] = useState(null)
  const [carregandoAudioId, setCarregandoAudioId] = useState(null)
  const [tocandoId, setTocandoId] = useState(null)
  const [tocandoUrl, setTocandoUrl] = useState({})
  const audioRef = useRef(null)

  useEffect(() => {
    carregarHistorico()
  }, [])

  useEffect(() => {
    return () => {
      Object.values(tocandoUrl).forEach((url) => URL.revokeObjectURL(url))
    }
  }, [tocandoUrl])

  async function carregarHistorico() {
    try {
      const res = await fetch('/api/conversations')
      if (!res.ok) return
      const data = await res.json()
      setConversas(data.conversas || [])
    } catch (err) {
      console.error('Erro ao carregar histórico:', err)
    } finally {
      setCarregando(false)
    }
  }

  function formatarData(isoString) {
    if (!isoString) return ''
    const data = new Date(isoString)
    return data.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  async function handleDeletar(id) {
    try {
      const res = await fetch(`/api/conversations?id=${id}`, { method: 'DELETE' })
      if (!res.ok) return
      setConversas((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      console.error('Erro ao deletar:', err)
    }
  }

  function handleCopiar(conv) {
    const texto = `Você: ${conv.pergunta}\nResposta: ${conv.resposta}`
    navigator.clipboard.writeText(texto)
    setCopiadoId(conv.id)
    setTimeout(() => setCopiadoId(null), 2000)
  }

  async function handleOuvir(conv) {
    if (tocandoId === conv.id) {
      audioRef.current?.pause()
      setTocandoId(null)
      return
    }
    if (tocandoUrl[conv.id]) {
      setTocandoId(conv.id)
      audioRef.current?.load()
      return
    }
    setCarregandoAudioId(conv.id)
    try {
      const ttsRes = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto: conv.resposta, lingua: conv.lingua }),
      })
      if (!ttsRes.ok) throw new Error('TTS indisponível')
      const blob = await ttsRes.blob()
      const url = URL.createObjectURL(blob)
      setTocandoUrl((prev) => ({ ...prev, [conv.id]: url }))
      setTocandoId(conv.id)
    } catch (_) {
      handleBaixarTxt(conv)
    } finally {
      setCarregandoAudioId(null)
    }
  }

  async function handleBaixarAudio(conv) {
    setCarregandoAudioId(conv.id)
    try {
      let url = tocandoUrl[conv.id]
      if (!url) {
        const ttsRes = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texto: conv.resposta, lingua: conv.lingua }),
        })
        if (!ttsRes.ok) throw new Error('TTS indisponível')
        const blob = await ttsRes.blob()
        url = URL.createObjectURL(blob)
      }
      const a = document.createElement('a')
      a.href = url
      a.download = `voz-da-gente-${conv.id}.wav`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (_) {
      handleBaixarTxt(conv)
    } finally {
      setCarregandoAudioId(null)
    }
  }

  function handleBaixarTxt(conv) {
    const texto = `Voz da Gente - Conversa\nData: ${formatarData(conv.created_at)}\n\nVocê: ${conv.pergunta}\n\nResposta: ${conv.resposta}`
    const blob = new Blob([texto], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `conversa-${conv.id}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  function handleCompartilhar(conv) {
    const texto = `🗣 Voz da Gente\n\nVocê: ${conv.pergunta}\nResposta: ${conv.resposta}`
    if (navigator.share) {
      navigator.share({ title: 'Voz da Gente', text: texto }).catch(() => {})
      setCompartilhadoId(conv.id)
      setTimeout(() => setCompartilhadoId(null), 2000)
    } else {
      navigator.clipboard.writeText(texto)
      setCopiadoId(conv.id)
      setTimeout(() => setCopiadoId(null), 2000)
    }
  }

  if (carregando) {
    return (
      <div className="text-center py-8">
        <svg className="animate-spin h-6 w-6 text-white/30 mx-auto" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <p className="text-sm text-white/40 mt-2">Carregando...</p>
      </div>
    )
  }

  if (conversas.length === 0) {
    return (
      <div className="text-center py-8">
        <svg className="h-10 w-10 text-white/20 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <p className="text-sm text-white/50">Nenhuma conversa ainda</p>
        <p className="text-xs text-white/30 mt-1">Faça sua primeira pergunta!</p>
      </div>
    )
  }

  function handleLimparTudo() {
    if (!confirm('Tem certeza? Todas as conversas serão apagadas permanentemente.')) return
    fetch('/api/conversations?tudo=true', { method: 'DELETE' })
      .then((r) => { if (r.ok) setConversas([]) })
      .catch(() => {})
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-amber-400 uppercase tracking-wider">
          Histórico
        </h3>
        {conversas.length > 0 && (
          <button
            onClick={handleLimparTudo}
            className="inline-flex items-center gap-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 border border-rose-400/20 px-2.5 py-1.5 text-[11px] text-rose-300/70 hover:text-rose-200 transition-all"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Limpar tudo
          </button>
        )}
      </div>

      {conversas.map((conv) => (
        <div
          key={conv.id}
          className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md p-4"
        >
          <div className="flex items-start justify-between mb-2">
            <span className="text-xs text-white/40">
              {formatarData(conv.created_at)}
            </span>
          </div>

          <div className="space-y-2 mb-3">
            <div>
              <span className="text-xs font-medium text-amber-400">Você</span>
              <p className="text-sm text-white/80 mt-0.5">{conv.pergunta}</p>
            </div>
            <div>
              <span className="text-xs font-medium text-white/50">Resposta</span>
              <p className="text-sm text-white/70 mt-0.5 whitespace-pre-wrap">
                {conv.resposta}
              </p>
            </div>
          </div>

          {tocandoId === conv.id && tocandoUrl[conv.id] && (
            <div className="mb-2">
              <audio
                ref={tocandoId === conv.id ? audioRef : null}
                src={tocandoUrl[conv.id]}
                controls
                autoPlay
                className="w-full h-8"
                onEnded={() => setTocandoId(null)}
              />
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
            <button
              onClick={() => handleOuvir(conv)}
              disabled={carregandoAudioId === conv.id}
              className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] transition-all disabled:opacity-50 ${tocandoId === conv.id ? 'bg-amber-500/20 border-amber-400/40 text-amber-300' : 'bg-white/10 hover:bg-white/20 border-white/20 text-white/60 hover:text-white'}`}
            >
              {carregandoAudioId === conv.id ? (
                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : tocandoId === conv.id ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              {tocandoId === conv.id ? 'Parar' : 'Ouvir'}
            </button>
            <button
              onClick={() => handleBaixarAudio(conv)}
              disabled={carregandoAudioId === conv.id}
              className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 px-2.5 py-1.5 text-[11px] text-white/60 hover:text-white transition-all disabled:opacity-50"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Baixar
            </button>
            <button
              onClick={() => handleCopiar(conv)}
              className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 px-2.5 py-1.5 text-[11px] text-white/60 hover:text-white transition-all"
            >
              {copiadoId === conv.id ? (
                <svg className="w-3 h-3 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              )}
              {copiadoId === conv.id ? 'Copiado' : 'Copiar'}
            </button>
            <button
              onClick={() => handleCompartilhar(conv)}
              className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/20 px-2.5 py-1.5 text-[11px] text-white/60 hover:text-white transition-all"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Compartilhar
            </button>
            <button
              onClick={() => { if (confirm('Deletar esta conversa?')) handleDeletar(conv.id) }}
              className="inline-flex items-center gap-1 rounded-lg bg-white/10 hover:bg-rose-500/30 border border-white/20 px-2.5 py-1.5 text-[11px] text-white/60 hover:text-rose-300 transition-all"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Deletar
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
