import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { texto, lingua } = await request.json()
    if (!texto || texto.trim() === '') {
      return NextResponse.json({ erro: 'Texto vazio.' }, { status: 400 })
    }

    const apiKey = process.env.FISH_AUDIO_API_KEY
    const modelId = process.env.FISH_AUDIO_MODEL_ID

    if (!apiKey || !modelId) {
      return NextResponse.json(
        { erro: 'FISH_AUDIO_API_KEY ou FISH_AUDIO_MODEL_ID não configurados.' },
        { status: 503 }
      )
    }

    const response = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'model': 's2.1-pro-free',
      },
      body: JSON.stringify({
        text: texto,
        reference_id: modelId,
        format: 'mp3',
        mp3_bitrate: 128,
        latency: 'normal',
        language: lingua || 'pt-br',
        prosody: { speed: 1, volume: 0, normalize_loudness: true },
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('Erro Fish Audio:', response.status, errorBody)
      let mensagem = `Erro no Fish Audio: ${response.status}`
      try {
        const errJson = JSON.parse(errorBody)
        if (errJson.message) mensagem = errJson.message
      } catch (_) {}
      return NextResponse.json({ erro: mensagem }, { status: response.status })
    }

    const audioBuffer = await response.arrayBuffer()

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error('Erro interno /api/tts:', error)
    return NextResponse.json({ erro: 'Erro interno do servidor.' }, { status: 500 })
  }
}
