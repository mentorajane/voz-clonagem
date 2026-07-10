import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const apiKey = process.env.FISH_AUDIO_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { erro: 'FISH_AUDIO_API_KEY não configurada.' },
        { status: 503 }
      )
    }

    const formData = await request.formData()
    const audioFile = formData.get('audio')
    const nome = formData.get('nome') || 'Minha Voz'

    if (!audioFile) {
      return NextResponse.json(
        { erro: 'Envie um arquivo de áudio.' },
        { status: 400 }
      )
    }

    const fishForm = new FormData()
    fishForm.append('type', 'tts')
    fishForm.append('title', nome)
    fishForm.append('train_mode', 'fast')
    fishForm.append('visibility', 'private')
    fishForm.append('voices', audioFile)
    fishForm.append('enhance_audio_quality', 'true')

    const response = await fetch('https://api.fish.audio/model', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}` },
      body: fishForm,
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error('Erro Fish Audio Clone:', response.status, errorBody)
      return NextResponse.json(
        { erro: `Erro ao clonar voz: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      sucesso: true,
      model_id: data._id,
      nome: data.title,
      languages: data.languages,
    })
  } catch (error) {
    console.error('Erro interno /api/tts/clone:', error)
    return NextResponse.json({ erro: 'Erro interno do servidor.' }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const apiKey = process.env.FISH_AUDIO_API_KEY
    const modelId = process.env.FISH_AUDIO_MODEL_ID
    if (!apiKey || !modelId) {
      return NextResponse.json({ erro: 'Nenhuma voz clonada para apagar.' }, { status: 400 })
    }
    const res = await fetch(`https://api.fish.audio/model/${modelId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    if (!res.ok) {
      const err = await res.text()
      console.error('Erro ao apagar modelo Fish Audio:', res.status, err)
      return NextResponse.json({ erro: 'Erro ao apagar voz clonada.' }, { status: 500 })
    }
    return NextResponse.json({ sucesso: true, mensagem: 'Voz clonada apagada.' })
  } catch (error) {
    console.error('Erro DELETE /api/tts/clone:', error)
    return NextResponse.json({ erro: 'Erro interno do servidor.' }, { status: 500 })
  }
}
