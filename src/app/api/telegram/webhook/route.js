import { NextResponse } from 'next/server'

const TELEGRAM_API = 'https://api.telegram.org/bot'

async function sendMessage(token, chatId, text) {
  await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  })
}

async function sendChatAction(token, chatId, action) {
  await fetch(`${TELEGRAM_API}${token}/sendChatAction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, action }),
  })
}

export async function POST(request) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return NextResponse.json({ ok: false, erro: 'Token não configurado' }, { status: 500 })

  const update = await request.json()
  if (!update.message?.text) return NextResponse.json({ ok: true })

  const chatId = update.message.chat.id
  const pergunta = update.message.text

  // Mostrar "digitando..."
  sendChatAction(token, chatId, 'typing')

  try {
    const groqKey = process.env.GROQ_API_KEY
    if (!groqKey) throw new Error('GROQ_API_KEY não configurada')

    // Carrega base de conhecimento do Supabase
    let almaContent = ''
    let negocioContent = ''
    let docsContent = ''
    let skillsContent = ''

    const { supabase } = await import('@/lib/supabase')

    try {
      const { data: alma } = await supabase.from('config').select('value').eq('key', 'base_conhecimento').single()
      if (alma?.value) almaContent = alma.value
    } catch {}

    try {
      const { data: negocio } = await supabase.from('config').select('value').eq('key', 'base_conhecimento_negocio').single()
      if (negocio?.value) negocioContent = negocio.value
    } catch {}

    try {
      const { data: docs } = await supabase.from('config').select('value').eq('key', 'materiais_docs').single()
      if (docs?.value) {
        const parsed = JSON.parse(docs.value)
        docsContent = parsed.map((d) => `--- Documento: ${d.nome} ---\n${d.texto || ''}`).join('\n\n')
      }
    } catch {}

    try {
      const { data: skills } = await supabase.from('config').select('value').eq('key', 'materiais_skills').single()
      if (skills?.value) {
        const parsed = JSON.parse(skills.value)
        skillsContent = parsed.map((s) => `--- Skill: ${s.nome} ---\n${s.texto || ''}`).join('\n\n')
      }
    } catch {}

    const materiaisTexto = [docsContent, skillsContent].filter(Boolean).join('\n\n')
    const materiaisBloco = materiaisTexto ? `\n\n## MATERIAIS DE REFERÊNCIA\nUse o conteúdo abaixo para responder.\n${materiaisTexto}` : ''
    const almaBloco = almaContent ? `\n\n## PERSONALIDADE E TOM\nVocê é a pessoa descrita abaixo. Responda SEMPRE no estilo, tom e personalidade dela.\n${almaContent}` : ''
    const negocioBloco = negocioContent ? `\n\n## INFORMAÇÕES DO NEGÓCIO\nUse estas informações para responder perguntas sobre serviços, produtos, valores e o negócio.\n${negocioContent}` : ''

    const systemPrompt = `Você é a pessoa descrita abaixo. Responda SEMPRE no estilo, tom e personalidade dela, usando as informações fornecidas. Seja EXTREMAMENTE CONCISO — no máximo 2-3 frases por resposta, direto ao ponto, sem rodeios. NUNCA fale como se fosse um robô ou IA genérica — você é a própria pessoa. Responda em português do Brasil.${almaBloco}${negocioBloco}${materiaisBloco}`

    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: pergunta },
        ],
        temperature: 0.5,
        max_tokens: 500,
      }),
    })

    if (!groqRes.ok) {
      const errText = await groqRes.text()
      throw new Error(`Groq error ${groqRes.status}: ${errText}`)
    }

    const data = await groqRes.json()
    const resposta = data.choices?.[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.'

    // Tenta gerar áudio com Fish Audio se tiver model_id e chave
    const fishModelId = process.env.FISH_AUDIO_MODEL_ID
    const fishKey = process.env.FISH_AUDIO_API_KEY
    if (fishModelId && fishKey && resposta.length < 500) {
      try {
        const ttsRes = await fetch('https://api.fish.audio/v1/tts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${fishKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: resposta,
            reference_id: fishModelId,
            model: 's2.1-pro-free',
            language: 'pt-br',
          }),
        })
        if (ttsRes.ok) {
          const audioBuffer = await ttsRes.arrayBuffer()
          const base64Audio = Buffer.from(audioBuffer).toString('base64')
          await fetch(`${TELEGRAM_API}${token}/sendVoice`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: chatId,
              voice: base64Audio,
            }),
          })
          return NextResponse.json({ ok: true })
        }
      } catch {}
    }

    // Se não conseguiu áudio, envia texto
    await sendMessage(token, chatId, resposta)
  } catch (err) {
    console.error('Telegram webhook error:', err)
    await sendMessage(token, chatId, 'Desculpe, ocorreu um erro ao processar sua mensagem.')
  }

  return NextResponse.json({ ok: true })
}
