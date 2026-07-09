'use client'

import { useState, useRef, useEffect } from 'react'
import { comprimirImagem } from '@/lib/utils'

const SENHA = '1234'

export default function ClonePage() {
  const [autenticado, setAutenticado] = useState(false)
  const [senhaInput, setSenhaInput] = useState('')
  const [senhaErro, setSenhaErro] = useState('')

  const [audioFile, setAudioFile] = useState(null)
  const [audioBlob, setAudioBlob] = useState(null)
  const [nome, setNome] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [resultado, setResultado] = useState(null)
  const [erro, setErro] = useState('')
  const [gravando, setGravando] = useState(false)
  const [tempoGrav, setTempoGrav] = useState(0)
  const [extraindo, setExtraindo] = useState(false)
  const mediaRecorder = useRef(null)
  const chunks = useRef([])
  const timerRef = useRef(null)
  const previewUrlRef = useRef(null)

  const [audioSalvo, setAudioSalvo] = useState(null)
  const audioSalvoRef = useRef(null)

  const [baseAlma, setBaseAlma] = useState('')
  const [baseNegocio, setBaseNegocio] = useState('')
  const [baseSalvando, setBaseSalvando] = useState(false)
  const [baseMensagem, setBaseMensagem] = useState('')
  const [materiaisDocs, setMateriaisDocs] = useState([])
  const [materiaisSkills, setMateriaisSkills] = useState([])
  const [materiaisImg, setMateriaisImg] = useState([])
  const [telegramAudio, setTelegramAudio] = useState(true)
  const [aviso, setAviso] = useState('')
  const [previewMaterial, setPreviewMaterial] = useState(null)
  const docSettingsRef = useRef(null)
  const skillSettingsRef = useRef(null)
  const imgSettingsRef = useRef(null)

  useEffect(() => {
    if (sessionStorage.getItem('clone_auth') === '1') setAutenticado(true)
    const audioBase64 = localStorage.getItem('gravacao_audio')
    if (audioBase64) {
      setAudioSalvo(audioBase64)
      const partes = audioBase64.split(',')
      const meta = partes[0] || ''
      const mime = meta.match(/:(.*?);/)?.[1] || 'audio/mp4'
      const ext = mime.includes('webm') ? 'webm' : mime.includes('wav') ? 'wav' : mime.includes('mpeg') ? 'mp3' : mime.includes('mp4') ? 'm4a' : 'm4a'
      const bin = atob(partes[1])
      const buf = new ArrayBuffer(bin.length)
      const view = new Uint8Array(buf)
      for (let i = 0; i < bin.length; i++) view[i] = bin.charCodeAt(i)
      const blob = new Blob([buf], { type: mime })
      const file = new File([blob], 'gravacao.' + ext, { type: mime })
      setAudioBlob(blob)
      setAudioFile(file)
    }
    ;(async () => {
      try {
        const alma = localStorage.getItem('base_conhecimento')
        const negocio = localStorage.getItem('base_conhecimento_negocio')
        if (alma) setBaseAlma(alma)
        if (negocio) setBaseNegocio(negocio)
        if (!alma) {
          const r = await fetch('/api/base-conhecimento?key=base_conhecimento')
          const d = await r.json()
          if (d.value) { setBaseAlma(d.value); try { localStorage.setItem('base_conhecimento', d.value) } catch {} }
        }
        if (!negocio) {
          const r = await fetch('/api/base-conhecimento?key=base_conhecimento_negocio')
          const d = await r.json()
          if (d.value) { setBaseNegocio(d.value); try { localStorage.setItem('base_conhecimento_negocio', d.value) } catch {} }
        }
      } catch {}
      const docsLocal = localStorage.getItem('materiais_docs')
      const skillsLocal = localStorage.getItem('materiais_skills')
      const imgsLocal = localStorage.getItem('materiais_img')
      if (docsLocal) setMateriaisDocs(JSON.parse(docsLocal))
      if (skillsLocal) setMateriaisSkills(JSON.parse(skillsLocal))
      const tgAudio = localStorage.getItem('telegram_audio')
      if (tgAudio !== null) setTelegramAudio(tgAudio === 'true')
      if (imgsLocal) setMateriaisImg(JSON.parse(imgsLocal))
      if (!docsLocal) {
        try { const r = await fetch('/api/base-conhecimento?key=materiais_docs'); const d = await r.json(); if (d.value) { setMateriaisDocs(JSON.parse(d.value)); localStorage.setItem('materiais_docs', d.value) } } catch {}
      }
      if (!skillsLocal) {
        try { const r = await fetch('/api/base-conhecimento?key=materiais_skills'); const d = await r.json(); if (d.value) { setMateriaisSkills(JSON.parse(d.value)); localStorage.setItem('materiais_skills', d.value) } } catch {}
      }
      if (!imgsLocal) {
        try { const r = await fetch('/api/base-conhecimento?key=materiais_img'); const d = await r.json(); if (d.value) { setMateriaisImg(JSON.parse(d.value)); localStorage.setItem('materiais_img', d.value) } } catch {}
      }
    })()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  async function salvarTudo() {
    setBaseSalvando(true)
    setBaseMensagem('')
    let erros = []
    try {
      localStorage.setItem('base_conhecimento', baseAlma)
      localStorage.setItem('base_conhecimento_negocio', baseNegocio)
      localStorage.setItem('materiais_docs', JSON.stringify(materiaisDocs))
      localStorage.setItem('materiais_skills', JSON.stringify(materiaisSkills))
      localStorage.setItem('materiais_img', JSON.stringify(materiaisImg))
      localStorage.setItem('telegram_audio', telegramAudio ? 'true' : 'false')
    } catch (_) {
      erros.push('localStorage')
    }
    try {
      const dados = [
        { key: 'base_conhecimento', value: baseAlma },
        { key: 'base_conhecimento_negocio', value: baseNegocio },
        { key: 'materiais_docs', value: JSON.stringify(materiaisDocs) },
        { key: 'materiais_skills', value: JSON.stringify(materiaisSkills) },
        { key: 'materiais_img', value: JSON.stringify(materiaisImg) },
      ]
      await Promise.all(dados.map((d) =>
        fetch('/api/base-conhecimento', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(d),
        })
      ))
    } catch (_) {
      erros.push('servidor')
    }
    if (erros.length === 0) {
      setBaseMensagem('Tudo salvo com sucesso!')
    } else {
      setBaseMensagem('Salvo, mas com aviso: ' + erros.join(', '))
    }
    setTimeout(() => setBaseMensagem(''), 4000)
    setBaseSalvando(false)
  }

  async function salvarMateriaisSupabase(docs, skills, imgs) {
    try {
      await Promise.all([
        fetch('/api/base-conhecimento', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'materiais_docs', value: JSON.stringify(docs) }),
        }),
        fetch('/api/base-conhecimento', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'materiais_skills', value: JSON.stringify(skills) }),
        }),
        fetch('/api/base-conhecimento', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'materiais_img', value: JSON.stringify(imgs) }),
        }),
      ])
    } catch {}
  }

  function handleDocSettings(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const texto = reader.result.slice(0, 4000)
      const novo = { nome: file.name, texto, tipo: 'doc' }
      const atualizados = [...materiaisDocs, novo]
      setMateriaisDocs(atualizados)
      localStorage.setItem('materiais_docs', JSON.stringify(atualizados))
      salvarMateriaisSupabase(atualizados, materiaisSkills, materiaisImg)
      setAviso('Documento lido com sucesso!'); setTimeout(() => setAviso(''), 3000)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  function handleSkillSettings(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const texto = reader.result.slice(0, 4000)
      const novo = { nome: file.name, texto, tipo: 'skill' }
      const atualizados = [...materiaisSkills, novo]
      setMateriaisSkills(atualizados)
      localStorage.setItem('materiais_skills', JSON.stringify(atualizados))
      salvarMateriaisSupabase(materiaisDocs, atualizados, materiaisImg)
      setAviso('Skill carregada com sucesso!'); setTimeout(() => setAviso(''), 3000)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  async function handleImgSettings(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const conteudo = await comprimirImagem(file)
    const novo = { nome: file.name, conteudo, tipo: 'img' }
    const atualizados = [...materiaisImg, novo]
    setMateriaisImg(atualizados)
    localStorage.setItem('materiais_img', JSON.stringify(atualizados))
    await salvarMateriaisSupabase(materiaisDocs, materiaisSkills, atualizados)
    setAviso('Imagem carregada com sucesso!'); setTimeout(() => setAviso(''), 3000)
    e.target.value = ''
  }

  async function iniciarGravacao() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/wav'
      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorder.current = recorder
      chunks.current = []
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.current.push(e.data) }
      recorder.onstop = () => {
        if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
        const blob = new Blob(chunks.current, { type: recorder.mimeType })
        setAudioBlob(blob)
        stream.getTracks().forEach((t) => t.stop())
        const file = new File([blob], 'gravacao.' + (blob.type.includes('webm') ? 'webm' : 'm4a'), { type: blob.type })
        setAudioFile(file)
        // Salva no localStorage como base64
        const reader = new FileReader()
        reader.onload = () => {
          const b64 = reader.result
          localStorage.setItem('gravacao_audio', b64)
          setAudioSalvo(b64)
        }
        reader.readAsDataURL(blob)
      }
      recorder.start()
      setGravando(true)
      setErro('')
      setTempoGrav(0)
      timerRef.current = setInterval(() => setTempoGrav((t) => t + 1), 1000)
    } catch (err) {
      setErro('Erro ao acessar microfone: ' + err.message)
    }
  }

  function pararGravacao() {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') mediaRecorder.current.stop()
    setGravando(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!audioFile) return
    setCarregando(true)
    setErro('')
    setResultado(null)
    const formData = new FormData()
    formData.append('audio', audioFile)
    formData.append('nome', nome || 'Minha Voz')
    try {
      const res = await fetch('/api/tts/clone', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.erro || 'Erro ao clonar')
      setResultado(data)
    } catch (err) { setErro(err.message) }
    finally { setCarregando(false) }
  }

  function formatarTempo(segundos) {
    const m = Math.floor(segundos / 60); const s = segundos % 60
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  if (!autenticado) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm">
          <div className="card-glass p-8 text-center">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-300/20 to-yellow-500/10 backdrop-blur-md border border-amber-300/30 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
              <svg className="w-7 h-7 text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.4)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-white mb-1">Configurar Voz</h2>
            <p className="text-sm text-white/50 mb-6">Área restrita. Digite a senha para continuar.</p>
            <form onSubmit={(e) => { e.preventDefault(); if (senhaInput === SENHA) { setAutenticado(true); sessionStorage.setItem('clone_auth', '1') } else { setSenhaErro('Senha incorreta'); setTimeout(() => setSenhaErro(''), 2000) } }}>
              <input type="password" value={senhaInput} onChange={(e) => setSenhaInput(e.target.value)} placeholder="Senha" autoFocus className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-amber-400/60 text-center mb-3" />
              <button type="submit" className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-medium text-white hover:bg-amber-600 transition-colors shadow-lg">Entrar</button>
              {senhaErro && <p className="text-xs text-rose-300 mt-2">{senhaErro}</p>}
            </form>
            <a href="/?chat=1" className="inline-block mt-4 text-xs text-white/40 hover:text-white/70 transition-colors">← Voltar ao início</a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">

      {/* Voltar */}
      <a href="/?chat=1"
        className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Voltar
      </a>

      {/* ===== CLONAR VOZ ===== */}
      <section className="card-glass p-6">
        <h1 className="text-xl font-bold text-white mb-2">Clonar Voz</h1>
        <p className="text-sm text-white/60 mb-6">Grave, envie áudio ou vídeo (10-30 segundos) para clonar sua voz. Vídeos têm o áudio extraído automaticamente.</p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-white/70 mb-1">Nome da voz</label>
            <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Minha Voz"
              className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-amber-400/60" />
          </div>
          <div>
            <p className="text-sm text-white/70 mb-2">Gravar áudio</p>
            <div className="flex items-center gap-3">
              {!gravando ? (
                <button type="button" onClick={iniciarGravacao}
                  className="flex items-center gap-2 rounded-xl bg-rose-600/80 hover:bg-rose-500 px-4 py-2.5 text-sm font-medium text-white transition-colors shadow-lg shadow-rose-500/10">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" /><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" /></svg>Gravar</button>
              ) : (
                <button type="button" onClick={pararGravacao}
                  className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white transition-colors animate-pulse shadow-lg shadow-rose-500/10">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>Parar ({formatarTempo(tempoGrav)})</button>
              )}
              {audioBlob && !gravando && <span className="text-xs text-amber-400">✓ Gravado ({formatarTempo(tempoGrav)})</span>}
            </div>
          </div>
          <div>
            <label className="block text-sm text-white/70 mb-1">Ou envie um arquivo</label>
            <p className="text-[11px] text-white/40 mb-2">Áudio: MP3, WAV, M4A, MP4 &middot; Vídeo: MP4, MOV, WebM (extrai o áudio automaticamente)</p>
            <input type="file" accept="audio/*,video/mp4,video/quicktime,video/webm"
              onChange={(e) => {
                const file = e.target.files[0]
                if (!file) return
                if (file.type.startsWith('video/')) {
                  setExtraindo(true)
                  const video = document.createElement('video')
                  video.muted = true
                  video.playsInline = true
                  const blobUrl = URL.createObjectURL(file)
                  video.src = blobUrl
                  video.onloadedmetadata = async () => {
                    try {
                      await video.play()
                      const stream = video.captureStream()
                      const audioTrack = stream.getAudioTracks()[0]
                      if (!audioTrack) { setExtraindo(false); setErro('Não foi possível extrair áudio deste vídeo.'); URL.revokeObjectURL(blobUrl); return }
                      const audioStream = new MediaStream([audioTrack])
                      const mime = MediaRecorder.isTypeSupported('audio/mp4') ? 'audio/mp4' : 'audio/webm'
                      const chunks = []
                      const recorder = new MediaRecorder(audioStream, { mimeType: mime })
                      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
                      recorder.onstop = () => {
                        const blob = new Blob(chunks, { type: mime })
                        setAudioBlob(blob)
                        const f = new File([blob], 'extraido.' + (mime.includes('mp4') ? 'm4a' : 'webm'), { type: mime })
                        setAudioFile(f)
                        const r = new FileReader()
                        r.onload = () => { localStorage.setItem('gravacao_audio', r.result); setAudioSalvo(r.result) }
                        r.readAsDataURL(blob)
                        video.pause()
                        URL.revokeObjectURL(blobUrl)
                        setExtraindo(false)
                      }
                      recorder.start()
                      video.onended = () => { if (recorder.state !== 'inactive') recorder.stop() }
                      setTimeout(() => { if (recorder.state !== 'inactive') recorder.stop() }, 61000)
                    } catch { setExtraindo(false); setErro('Falha ao extrair áudio do vídeo.'); URL.revokeObjectURL(blobUrl) }
                  }
                } else {
                  setAudioFile(file)
                  setAudioBlob(null)
                  if (previewUrlRef.current) { URL.revokeObjectURL(previewUrlRef.current); previewUrlRef.current = null }
                  const reader = new FileReader()
                  reader.onload = () => { localStorage.setItem('gravacao_audio', reader.result); setAudioSalvo(reader.result) }
                  reader.readAsDataURL(file)
                }
              }}
              className="w-full text-sm text-white/60 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:bg-amber-500/20 file:text-amber-300 hover:file:bg-amber-500/30 file:cursor-pointer cursor-pointer disabled:opacity-50" disabled={extraindo} />
          </div>
          {extraindo && <p className="text-xs text-amber-300/80 flex items-center gap-1"><svg className="animate-spin h-3 w-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Extraindo áudio do vídeo...</p>}
          {audioFile && !extraindo && <p className="text-xs text-white/40 -mt-2">{audioFile.name} ({(audioFile.size / 1024 / 1024).toFixed(1)} MB)</p>}
          {audioSalvo && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-400/20 px-3 py-2">
              <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              <audio ref={audioSalvoRef} src={audioSalvo} controls className="flex-1 h-8 min-w-0" playsInline />
              <button type="button" onClick={() => { localStorage.removeItem('gravacao_audio'); setAudioSalvo(null); setAudioBlob(null); setAudioFile(null); if (audioSalvoRef.current) { audioSalvoRef.current.pause(); audioSalvoRef.current.src = '' } }}
                className="text-rose-400/60 hover:text-rose-300 transition-colors flex-shrink-0" title="Remover gravação">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
          <button type="submit" disabled={!audioFile || carregando}
            className="w-full rounded-xl bg-amber-500 py-2.5 text-sm font-medium text-white hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {carregando ? 'Clonando...' : 'Clonar Voz'}
          </button>
        </form>
        {carregando && (
          <div className="mt-4 flex items-center gap-2 text-sm text-amber-300/80">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Processando áudio e clonando voz...</div>
        )}
        {resultado && (
          <div className="mt-4 rounded-xl bg-amber-500/20 border border-amber-400/30 p-4">
            <p className="text-sm text-amber-300 font-medium">Voz clonada com sucesso!</p>
            <p className="text-xs text-amber-300/70 mt-1">Model ID: <code className="text-amber-200 bg-amber-500/10 px-1 rounded">{resultado.model_id}</code></p>
          </div>
        )}
        {erro && <div className="mt-4 rounded-xl bg-rose-500/20 border border-rose-400/30 px-4 py-3 text-sm text-rose-200">{erro}</div>}
      </section>

      {/* ===== A ALMA (persona) ===== */}
      <section className="card-glass p-6">
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h2 className="text-xl font-bold text-white">Base de Conhecimento — A Alma</h2>
        </div>
        <p className="text-sm text-white/60 mb-4">Quem é a pessoa? Personalidade, tom de voz, jeito de falar, bordões.</p>
        <textarea value={baseAlma} onChange={(e) => setBaseAlma(e.target.value)} rows={12}
          className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-amber-400/60 font-mono leading-relaxed resize-y"
          placeholder="Nome, profissão, personalidade, tom de voz, bordões, jeito de falar..." />
      </section>

      {/* ===== NEGÓCIO ===== */}
      <section className="card-glass p-6">
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          <h2 className="text-xl font-bold text-white">Base de Conhecimento — Negócio</h2>
        </div>
        <p className="text-sm text-white/60 mb-4">Serviços, produtos, mentoria, consultorias — tudo sobre o negócio. O assistente consulta isso para responder.</p>
        <textarea value={baseNegocio} onChange={(e) => setBaseNegocio(e.target.value)} rows={12}
          className="w-full rounded-xl bg-white/10 border border-white/20 px-4 py-3 text-sm text-white placeholder-white/40 focus:outline-none focus:border-emerald-400/60 font-mono leading-relaxed resize-y"
          placeholder="Descreva os serviços, produtos, valores, diferenciais, público-alvo..." />

        <div className="flex items-center gap-3 mt-4">
          <button onClick={salvarTudo} disabled={baseSalvando}
            className="rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2.5 text-sm font-medium text-white transition-colors disabled:opacity-50 shadow-lg shadow-amber-500/10">
            {baseSalvando ? 'Salvando...' : 'Salvar Tudo'}
          </button>
          {baseMensagem && (
            <span className={`text-sm ${baseMensagem.includes('sucesso') ? 'text-green-400' : 'text-red-400'}`}>{baseMensagem}</span>
          )}
        </div>
      </section>

      {/* ===== MATERIAIS DE REFERÊNCIA ===== */}
      <section className="card-glass p-6">
        <div className="flex items-center gap-2 mb-1">
          <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h2 className="text-xl font-bold text-white">Materiais de Referência</h2>
        </div>
        <p className="text-xs text-white/50 mb-4">Envie documentos markdown, skills e imagens que o assistente pode consultar para entender melhor o negócio.</p>

        <div className="flex gap-2 mb-4 flex-wrap">
          <input ref={docSettingsRef} type="file" accept=".md,.txt" onChange={handleDocSettings} className="hidden" />
          <button onClick={() => docSettingsRef.current?.click()}
            className="flex items-center gap-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/30 px-4 py-2 text-sm text-amber-300 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11v4m0 0l-2-2m2 2l2-2" />
            </svg>Adicionar Documento
          </button>
          <input ref={skillSettingsRef} type="file" accept=".md,.txt" onChange={handleSkillSettings} className="hidden" />
          <button onClick={() => skillSettingsRef.current?.click()}
            className="flex items-center gap-2 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 border border-violet-400/30 px-4 py-2 text-sm text-violet-300 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>Adicionar Skill
          </button>
          <input ref={imgSettingsRef} type="file" accept="image/png,image/jpeg" onChange={handleImgSettings} className="hidden" />
          <button onClick={() => imgSettingsRef.current?.click()}
            className="flex items-center gap-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 px-4 py-2 text-sm text-sky-300 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>Adicionar Imagem
          </button>
        </div>

        {aviso && (
          <div className="text-xs text-emerald-400 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {aviso}
          </div>
        )}

        {materiaisDocs.length === 0 && materiaisSkills.length === 0 && materiaisImg.length === 0 ? (
          <p className="text-sm text-white/40 italic">Nenhum material adicionado.</p>
        ) : (
          <div className="space-y-2">
            {materiaisDocs.map((p, i) => (
              <div key={`md-${i}`} className="flex items-center justify-between rounded-lg bg-amber-500/10 border border-amber-400/20 px-3 py-2">
                <button onClick={() => setPreviewMaterial(p)} className="flex items-center gap-2 text-sm text-amber-300 flex-1 min-w-0 text-left cursor-pointer hover:text-white transition-colors">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="truncate">{p.nome}</span>
                  {p.texto && <span className="text-[10px] text-amber-400/60 flex-shrink-0">({p.texto.length} caracteres)</span>}
                </button>
                <button onClick={async () => { const a = materiaisDocs.filter((_, idx) => idx !== i); setMateriaisDocs(a); localStorage.setItem('materiais_docs', JSON.stringify(a)); await salvarMateriaisSupabase(a, materiaisSkills, materiaisImg) }}
                  className="text-red-400/60 hover:text-red-300 text-sm flex-shrink-0">&times;</button>
              </div>
            ))}
            {materiaisSkills.map((s, i) => (
              <div key={`ms-${i}`} className="flex items-center justify-between rounded-lg bg-violet-500/10 border border-violet-400/20 px-3 py-2">
                <button onClick={() => setPreviewMaterial(s)} className="flex items-center gap-2 text-sm text-violet-300 flex-1 min-w-0 text-left cursor-pointer hover:text-white transition-colors">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span className="truncate">{s.nome}</span>
                  {s.texto && <span className="text-[10px] text-violet-400/60 flex-shrink-0">({s.texto.length} caracteres)</span>}
                </button>
                <button onClick={async () => { const a = materiaisSkills.filter((_, idx) => idx !== i); setMateriaisSkills(a); localStorage.setItem('materiais_skills', JSON.stringify(a)); await salvarMateriaisSupabase(materiaisDocs, a, materiaisImg) }}
                  className="text-red-400/60 hover:text-red-300 text-sm flex-shrink-0">&times;</button>
              </div>
            ))}
            {materiaisImg.map((img, i) => (
              <div key={`mi-${i}`} className="flex items-center justify-between rounded-lg bg-sky-500/10 border border-sky-400/20 px-3 py-2">
                <button onClick={() => setPreviewMaterial(img)} className="flex items-center gap-2 text-sm text-sky-300 flex-1 min-w-0 text-left cursor-pointer hover:text-white transition-colors">
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {img.nome}
                </button>
                <button onClick={async () => { const a = materiaisImg.filter((_, idx) => idx !== i); setMateriaisImg(a); localStorage.setItem('materiais_img', JSON.stringify(a)); await salvarMateriaisSupabase(materiaisDocs, materiaisSkills, a) }}
                  className="text-red-400/60 hover:text-red-300 text-sm flex-shrink-0">&times;</button>
              </div>
            ))}
            {(materiaisDocs.length > 0 || materiaisSkills.length > 0 || materiaisImg.length > 0) && (
              <button onClick={async () => { setMateriaisDocs([]); setMateriaisSkills([]); setMateriaisImg([]); localStorage.removeItem('materiais_docs'); localStorage.removeItem('materiais_skills'); localStorage.removeItem('materiais_img'); await salvarMateriaisSupabase([], [], []) }}
                className="text-xs text-white/40 hover:text-red-300 transition-colors mt-2">Limpar todos</button>
            )}
          </div>
        )}

        {/* Modal de preview */}
        {previewMaterial && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4" onClick={() => setPreviewMaterial(null)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <div className="relative w-full max-w-lg max-h-[80vh] rounded-2xl bg-gray-900/95 border border-white/20 backdrop-blur-xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-white truncate">{previewMaterial.nome}</span>
                </div>
                <button type="button" onClick={() => setPreviewMaterial(null)} className="text-white/40 hover:text-white/70 transition-colors flex-shrink-0 ml-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-5 overflow-y-auto max-h-[calc(80vh-60px)]">
                {previewMaterial.tipo === 'img' && previewMaterial.conteudo ? (
                  <img src={previewMaterial.conteudo} alt={previewMaterial.nome} className="w-full rounded-lg" />
                ) : previewMaterial.texto ? (
                  <pre className="text-xs text-white/80 whitespace-pre-wrap font-mono leading-relaxed">{previewMaterial.texto}</pre>
                ) : (
                  <p className="text-sm text-white/40 italic">Conteúdo não disponível para visualização.</p>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="mt-4 flex items-center gap-3">
          <button onClick={async () => {
            try {
              localStorage.setItem('materiais_docs', JSON.stringify(materiaisDocs))
              localStorage.setItem('materiais_skills', JSON.stringify(materiaisSkills))
              localStorage.setItem('materiais_img', JSON.stringify(materiaisImg))
              await salvarMateriaisSupabase(materiaisDocs, materiaisSkills, materiaisImg)
              setAviso('Materiais salvos com sucesso!'); setTimeout(() => setAviso(''), 3000)
            } catch { setAviso('Erro ao salvar materiais.'); setTimeout(() => setAviso(''), 3000) }
          }}
            className="rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2.5 text-sm font-medium text-white transition-colors shadow-lg shadow-amber-500/10">
            Salvar Materiais
          </button>
          <label className="flex items-center gap-2 text-sm text-white/50 cursor-pointer ml-2">
            <span>Áudio no Telegram</span>
            <button type="button" role="switch" aria-checked={telegramAudio} onClick={() => {
              setTelegramAudio(!telegramAudio)
              localStorage.setItem('telegram_audio', (!telegramAudio) ? 'true' : 'false')
            }}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${telegramAudio ? 'bg-amber-500' : 'bg-white/20'}`}>
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${telegramAudio ? 'translate-x-[18px]' : 'translate-x-[3px]'}`} />
            </button>
          </label>
        </div>
      </section>

    </div>
  )
}
