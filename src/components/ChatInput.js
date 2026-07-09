'use client'

import { useState, useRef } from 'react'
import { comprimirImagem } from '@/lib/utils'

export default function ChatInput({ onEnviar, carregando }) {
  const [pergunta, setPergunta] = useState('')
  const [ouvindo, setOuvindo] = useState(false)
  const [arquivos, setArquivos] = useState([])
  const [aviso, setAviso] = useState('')
  const [previewArquivo, setPreviewArquivo] = useState(null)
  const textareaRef = useRef(null)
  const docRef = useRef(null)
  const imgRef = useRef(null)
  const recognitionRef = useRef(null)
  const avisoTimer = useRef(null)

  function carregarClone() {
    return {
      docs: JSON.parse(localStorage.getItem('materiais_docs') || '[]'),
      skills: JSON.parse(localStorage.getItem('materiais_skills') || '[]'),
      imagens: JSON.parse(localStorage.getItem('materiais_img') || '[]'),
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const texto = pergunta.trim()
    if (!texto || carregando) return
    const clone = carregarClone()
    const sessaoDocs = arquivos.filter((a) => a.tipo === 'doc')
    const sessaoImgs = arquivos.filter((a) => a.tipo === 'img')
    onEnviar(texto, {
      docs: [...sessaoDocs, ...clone.docs],
      skills: clone.skills,
      imagens: [...sessaoImgs, ...clone.imagens],
    })
    setPergunta('')
    setArquivos([])
  }

  function handleInput(e) {
    setPergunta(e.target.value)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  function mostrarAviso(msg) {
    setAviso(msg)
    if (avisoTimer.current) clearTimeout(avisoTimer.current)
    avisoTimer.current = setTimeout(() => setAviso(''), 3000)
  }

  function handleDocUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const texto = reader.result.slice(0, 4000)
      setArquivos((prev) => [...prev, { nome: file.name, texto, tipo: 'doc', icon: 'doc' }])
      mostrarAviso('Documento lido com sucesso!')
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function handleImgUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const conteudo = await comprimirImagem(file)
    setArquivos((prev) => [...prev, { nome: file.name, conteudo, tipo: 'img', icon: 'img' }])
    mostrarAviso('Imagem carregada com sucesso!')
    e.target.value = ''
  }

  function toggleMicrofone() {
    if (ouvindo) {
      recognitionRef.current?.stop()
      setOuvindo(false)
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Reconhecimento de voz não suportado neste navegador.')
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'pt-BR'
    recognition.continuous = false
    recognition.interimResults = true
    recognitionRef.current = recognition

    recognition.onresult = (e) => {
      const transcript = Array.from(e.results).map((r) => r[0].transcript).join('')
      setPergunta(transcript)
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`
      }
    }

    recognition.onend = () => {
      setOuvindo(false)
      setPergunta((prev) => {
        if (prev.trim()) {
          setTimeout(() => {
            const form = textareaRef.current?.closest('form')
            form?.requestSubmit()
          }, 300)
        }
        return prev
      })
    }

    recognition.onerror = () => setOuvindo(false)
    recognition.start()
    setOuvindo(true)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <textarea
            ref={textareaRef}
            value={pergunta}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Digite sua pergunta..."
            rows={1}
            disabled={carregando}
            className="w-full resize-none rounded-xl border border-white/20 px-4 py-[11px] text-white placeholder-white/40 bg-white/10 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors backdrop-blur-sm"
          />
        </div>

        <div className="flex gap-1.5 sm:self-center">
          <input ref={docRef} type="file" accept=".md,.txt" onChange={handleDocUpload} className="hidden" />
          <button
            type="button"
            onClick={() => docRef.current?.click()}
            disabled={carregando}
            className="rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-[11px] text-white/60 hover:text-white transition-all disabled:opacity-50"
            title="Adicionar Documento (.md, .txt)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11v4m0 0l-2-2m2 2l2-2" />
            </svg>
          </button>
          <input ref={imgRef} type="file" accept="image/*" onChange={handleImgUpload} className="hidden" />
          <button
            type="button"
            onClick={() => imgRef.current?.click()}
            disabled={carregando}
            className="rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-[11px] text-white/60 hover:text-white transition-all disabled:opacity-50"
            title="Adicionar Imagem"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={toggleMicrofone}
            disabled={carregando}
            className={`rounded-xl border px-3 py-[11px] transition-all ${ouvindo ? 'bg-amber-500/30 border-amber-400/60 text-amber-300 shadow-lg shadow-amber-500/20 animate-pulse' : 'bg-white/10 hover:bg-white/20 border-white/20 text-white/60 hover:text-white'}`}
            title={ouvindo ? 'Parar gravação' : 'Falar'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          </button>
          <button
            type="submit"
            disabled={carregando || !pergunta.trim()}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-[11px] text-white font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
          >
            {carregando ? (
              <span className="flex items-center gap-1 text-sm whitespace-nowrap">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <span className="hidden sm:inline">Pensando...</span>
              </span>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {aviso && (
        <div className="text-xs text-emerald-400 flex items-center gap-1.5 animate-pulse">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {aviso}
        </div>
      )}
      {arquivos.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {arquivos.map((a, i) => (
            <span key={`arq-${i}`} className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-xs ${a.icon === 'doc' ? 'bg-amber-500/15 border-amber-400/25 text-amber-300' : 'bg-sky-500/15 border-sky-400/25 text-sky-300'}`}>
              {a.icon === 'doc' ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
              <button type="button" onClick={() => setPreviewArquivo(a)} className="truncate max-w-[120px] hover:text-white transition-colors cursor-pointer text-left">{a.nome}</button>
              <button type="button" onClick={() => setArquivos((prev) => prev.filter((_, idx) => idx !== i))} className="text-red-400/60 hover:text-red-300 ml-0.5 leading-none">&times;</button>
            </span>
          ))}
        </div>
      )}

      {/* Modal de preview */}
      {previewArquivo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setPreviewArquivo(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg max-h-[80vh] rounded-2xl bg-gray-900/95 border border-white/20 backdrop-blur-xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
              <div className="flex items-center gap-2 min-w-0">
                {previewArquivo.icon === 'doc' ? (
                  <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 text-sky-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
                <span className="text-sm font-medium text-white truncate">{previewArquivo.nome}</span>
              </div>
              <button type="button" onClick={() => setPreviewArquivo(null)} className="text-white/40 hover:text-white/70 transition-colors flex-shrink-0 ml-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[calc(80vh-60px)]">
              {previewArquivo.tipo === 'img' && previewArquivo.conteudo ? (
                <img src={previewArquivo.conteudo} alt={previewArquivo.nome} className="w-full rounded-lg" />
              ) : previewArquivo.texto ? (
                <pre className="text-xs text-white/80 whitespace-pre-wrap font-mono leading-relaxed">{previewArquivo.texto}</pre>
              ) : (
                <p className="text-sm text-white/40 italic">Conteúdo não disponível para visualização.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </form>
  )
}
