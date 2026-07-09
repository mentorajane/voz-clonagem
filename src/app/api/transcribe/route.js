import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) {
      return NextResponse.json({ erro: 'GROQ_API_KEY não configurada.' }, { status: 503 })
    }

    const formData = await request.formData()
    const audio = formData.get('audio')
    if (!audio) {
      return NextResponse.json({ erro: 'Envie um arquivo de áudio.' }, { status: 400 })
    }

    const groqForm = new FormData()
    groqForm.append('file', audio, 'audio.webm')
    groqForm.append('model', 'whisper-large-v3-turbo')
    groqForm.append('language', 'pt')

    const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: groqForm,
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Erro Groq Whisper:', res.status, err)
      return NextResponse.json({ erro: 'Erro ao transcrever áudio.' }, { status: 500 })
    }

    const data = await res.json()
    return NextResponse.json({ texto: data.text || '' })
  } catch (error) {
    console.error('Erro /api/transcribe:', error)
    return NextResponse.json({ erro: 'Erro interno do servidor.' }, { status: 500 })
  }
}
