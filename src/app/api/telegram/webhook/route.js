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

async function downloadFile(token, fileId) {
  const fileRes = await fetch(`${TELEGRAM_API}${token}/getFile?file_id=${fileId}`)
  const fileData = await fileRes.json()
  if (!fileData.ok || !fileData.result?.file_path) return null
  const fileResp = await fetch(`https://api.telegram.org/file/bot${token}/${fileData.result.file_path}`)
  const buffer = await fileResp.arrayBuffer()
  return Buffer.from(buffer)
}

function buildSystemPrompt(almaContent, negocioContent, docsContent, skillsContent) {
  const materiaisTexto = [docsContent, skillsContent].filter(Boolean).join('\n\n')
  const materiaisBloco = materiaisTexto ? `\n\n## MATERIAIS DE REFERÊNCIA\nUse o conteúdo abaixo para responder.\n${materiaisTexto}` : ''
  const almaBloco = almaContent ? `\n\n## PERSONALIDADE E TOM\nVocê é a pessoa descrita abaixo. Responda SEMPRE no estilo, tom e personalidade dela.\n${almaContent}` : ''
  const negocioBloco = negocioContent ? `\n\n## INFORMAÇÕES DO NEGÓCIO\nUse estas informações para responder perguntas sobre serviços, produtos, valores e o negócio.\n${negocioContent}` : ''
  return `Você é a pessoa descrita abaixo. Responda SEMPRE no estilo, tom e personalidade dela, usando as informações fornecidas. Seja EXTREMAMENTE CONCISO — no máximo 2-3 frases por resposta, direto ao ponto, sem rodeios. NUNCA fale como se fosse um robô ou IA genérica — você é a própria pessoa. Responda em português do Brasil.${almaBloco}${negocioBloco}${materiaisBloco}`
}

async function carregarBase() {
  let almaContent = '', negocioContent = '', docsContent = '', skillsContent = ''
  let telegramAudio = true
  try {
    const { supabase } = await import('@/lib/supabase')
    const { data: alma } = await supabase.from('config').select('value').eq('key', 'base_conhecimento').single()
    if (alma?.value) almaContent = alma.value
  } catch {}
  try {
    const { supabase } = await import('@/lib/supabase')
    const { data: negocio } = await supabase.from('config').select('value').eq('key', 'base_conhecimento_negocio').single()
    if (negocio?.value) negocioContent = negocio.value
  } catch {}
  try {
    const { supabase } = await import('@/lib/supabase')
    const { data: docs } = await supabase.from('config').select('value').eq('key', 'materiais_docs').single()
    if (docs?.value) { const p = JSON.parse(docs.value); docsContent = p.map((d) => `--- Documento: ${d.nome} ---\n${d.texto || ''}`).join('\n\n') }
  } catch {}
  try {
    const { supabase } = await import('@/lib/supabase')
    const { data: skills } = await supabase.from('config').select('value').eq('key', 'materiais_skills').single()
    if (skills?.value) { const p = JSON.parse(skills.value); skillsContent = p.map((s) => `--- Skill: ${s.nome} ---\n${s.texto || ''}`).join('\n\n') }
  } catch {}
  try {
    const { supabase } = await import('@/lib/supabase')
    const { data: tg } = await supabase.from('config').select('value').eq('key', 'telegram_audio').single()
    if (tg?.value) telegramAudio = tg.value === 'true'
  } catch {}
  return { almaContent, negocioContent, docsContent, skillsContent, telegramAudio }
}

async function chamarGroqTexto(groqKey, systemPrompt, pergunta) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
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
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.choices?.[0]?.message?.content || 'Desculpe, não consegui gerar uma resposta.'
}

async function chamarGroqVisao(groqKey, systemPrompt, pergunta, base64Imagem) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'meta-llama/llama-4-scout-17b-16e-instruct',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: [
          { type: 'text', text: `[IMAGEM RECEBIDA] ${pergunta || 'Descreva esta imagem.'}` },
          { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Imagem}` } },
        ]},
      ],
      temperature: 0.5,
      max_tokens: 800,
    }),
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.choices?.[0]?.message?.content || 'Desculpe, não consegui analisar a imagem.'
}

async function transcreverAudio(groqKey, buffer) {
  const formData = new FormData()
  const blob = new Blob([buffer], { type: 'audio/ogg' })
  formData.append('file', blob, 'audio.ogg')
  formData.append('model', 'whisper-large-v3-turbo')
  formData.append('language', 'pt')
  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${groqKey}` },
    body: formData,
  })
  if (!res.ok) throw new Error(await res.text())
  const data = await res.json()
  return data.text || ''
}

async function enviarAudioFish(token, chatId, fishKey, fishModelId, texto, telegramAudio) {
  if (!telegramAudio) return false
  try {
    const ttsRes = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${fishKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: texto, reference_id: fishModelId, model: 's2.1-pro-free', language: 'pt-br' }),
    })
    if (!ttsRes.ok) return false
    const audioBuffer = await ttsRes.arrayBuffer()
    const form = new FormData()
    form.append('chat_id', String(chatId))
    form.append('voice', new Blob([audioBuffer], { type: 'audio/ogg' }), 'audio.ogg')
    await fetch(`${TELEGRAM_API}${token}/sendVoice`, { method: 'POST', body: form })
    return true
  } catch { return false }
}

export async function POST(request) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) return NextResponse.json({ ok: false, erro: 'Token não configurado' }, { status: 500 })

  const update = await request.json()
  const msg = update.message
  if (!msg) return NextResponse.json({ ok: true })

  const chatId = msg.chat.id
  const groqKey = process.env.GROQ_API_KEY
  const fishKey = process.env.FISH_AUDIO_API_KEY
  const fishModelId = process.env.FISH_AUDIO_MODEL_ID

  if (!groqKey) return NextResponse.json({ ok: true })

  try {
    const base = await carregarBase()
    const systemPrompt = buildSystemPrompt(base.almaContent, base.negocioContent, base.docsContent, base.skillsContent)

    // === FOTO ===
    if (msg.photo) {
      sendChatAction(token, chatId, 'typing')
      const photo = msg.photo[msg.photo.length - 1]
      const buffer = await downloadFile(token, photo.file_id)
      if (buffer) {
        const b64 = buffer.toString('base64')
        const legenda = msg.caption || ''
        const resposta = await chamarGroqVisao(groqKey, systemPrompt, legenda, b64)
        const enviouAudio = await enviarAudioFish(token, chatId, fishKey, fishModelId, resposta, base.telegramAudio)
        if (!enviouAudio) await sendMessage(token, chatId, resposta)
      }
      return NextResponse.json({ ok: true })
    }

    // === VOZ / ÁUDIO ===
    if (msg.voice || msg.audio) {
      sendChatAction(token, chatId, 'typing')
      const fileId = msg.voice?.file_id || msg.audio?.file_id
      const buffer = await downloadFile(token, fileId)
      if (buffer) {
        const transcricao = await transcreverAudio(groqKey, buffer)
        if (transcricao) {
          const resposta = await chamarGroqTexto(groqKey, systemPrompt, `(Mensagem de voz: "${transcricao}")`)
          const enviouAudio = await enviarAudioFish(token, chatId, fishKey, fishModelId, resposta, base.telegramAudio)
          if (!enviouAudio) await sendMessage(token, chatId, resposta)
        }
      }
      return NextResponse.json({ ok: true })
    }

    // === DOCUMENTO ===
    if (msg.document) {
      const nome = msg.document.file_name || 'documento'
      if (nome.endsWith('.md') || nome.endsWith('.txt')) {
        sendChatAction(token, chatId, 'typing')
        const buffer = await downloadFile(token, msg.document.file_id)
        if (buffer) {
          const texto = buffer.toString('utf-8').slice(0, 4000)
          const resposta = await chamarGroqTexto(groqKey, systemPrompt, `Recebi este documento (${nome}):\n\n${texto}\n\nResuma e diga o que aprendeu com ele.`)
          await sendMessage(token, chatId, resposta)
        }
      } else {
        await sendMessage(token, chatId, `Recebi o arquivo "${nome}". Só aceito documentos .md e .txt.`)
      }
      return NextResponse.json({ ok: true })
    }

    // === TEXTO (padrão) ===
    if (!msg.text) return NextResponse.json({ ok: true })

    sendChatAction(token, chatId, 'typing')
    const resposta = await chamarGroqTexto(groqKey, systemPrompt, msg.text)
    const enviouAudio = await enviarAudioFish(token, chatId, fishKey, fishModelId, resposta, base.telegramAudio)
    if (!enviouAudio) await sendMessage(token, chatId, resposta)

  } catch (err) {
    console.error('Telegram webhook error:', err)
    await sendMessage(token, chatId, 'Desculpe, ocorreu um erro ao processar sua mensagem.')
  }

  return NextResponse.json({ ok: true })
}
