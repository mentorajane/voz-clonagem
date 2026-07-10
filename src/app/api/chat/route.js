// ============================================
// API Route: /api/chat
// Envia a pergunta para o Groq com o system prompt
// baseado no arquivo de base de conhecimento
// ============================================
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { completarChat } from '@/lib/llm'
import fs from 'fs'
import path from 'path'

export async function POST(request) {
  try {
    const { pergunta, lingua, base_alma: baseAlmaEnviada, base_negocio: baseNegocioEnviada, materiais, historico } = await request.json()

    if (!pergunta || pergunta.trim() === '') {
      return NextResponse.json(
        { erro: 'A pergunta não pode estar vazia.' },
        { status: 400 }
      )
    }

    // Base ALMA (personalidade) — prioridade: frontend > Supabase > arquivo local
    let almaContent = baseAlmaEnviada || ''
    if (!almaContent) {
      try {
        const { data } = await supabase.from('config').select('value').eq('key', 'base_conhecimento').single()
        if (data?.value) almaContent = data.value
      } catch (_) {}
    }
    if (!almaContent) {
      try { almaContent = fs.readFileSync(path.join(process.cwd(), 'base-de-conhecimento.md'), 'utf-8') } catch (_) {}
    }

    // Base NEGÓCIO — enviada pelo frontend (localStorage)
    let negocioContent = baseNegocioEnviada || ''

    // Materiais de referência (documentos, skills e imagens enviados pelo usuário)
    let materiaisTexto = ''
    // Só imagens anexadas NA MENSAGEM ATUAL ativam a visão (evita alucinação com imagens de materiais)
    const imagensParaVisao = materiais?.imagens_sessao?.filter((img) => img.conteudo) || []
    if (materiais) {
      const partes = []
      if (materiais.docs?.length) {
        for (const doc of materiais.docs) {
          let bloco = `--- Documento: ${doc.nome} ---`
          if (doc.texto) bloco += `\n${doc.texto}`
          partes.push(bloco)
        }
      }
      if (materiais.skills?.length) {
        for (const skill of materiais.skills) {
          let bloco = `--- Skill: ${skill.nome} ---`
          if (skill.texto) bloco += `\n${skill.texto}`
          partes.push(bloco)
        }
      }
      if (partes.length) {
        materiaisTexto = `\n\n## MATERIAIS DE REFERÊNCIA\nUse o conteúdo abaixo para responder perguntas sobre serviços, produtos, skills e materiais.\n${partes.join('\n\n')}`
      }
    }

    const temImagens = imagensParaVisao.length > 0
    const modelo = temImagens ? 'meta-llama/llama-4-scout-17b-16e-instruct' : 'llama-3.1-8b-instant'
    const modeloNvidia = temImagens ? 'minimaxai/minimax-m3' : 'meta/llama-3.1-8b-instruct'

    const linguaNomes = { 'pt-br': 'Português (Brasil)', 'pt': 'Português (Portugal)', 'en': 'inglês', 'es': 'espanhol', 'fr': 'francês', 'de': 'alemão', 'it': 'italiano', 'ja': 'japonês', 'zh-cn': 'chinês simplificado' }
    const linguaInstrucao = lingua && lingua !== 'pt-br' ? `\n\n## REGRA DE IDIOMA — MUITO IMPORTANTE\nVocê DEVE responder SOMENTE em ${linguaNomes[lingua] || lingua}. NÃO escreva em português. NÃO misture idiomas. Toda a resposta deve estar integralmente em ${linguaNomes[lingua] || lingua}. Ignore o idioma da pergunta — responda sempre em ${linguaNomes[lingua] || lingua}.` : ''
    const negocioBloco = negocioContent ? `\n\n## INFORMAÇÕES DO NEGÓCIO\nUse estas informações para responder perguntas sobre serviços, produtos, valores e o negócio.\n${negocioContent}` : ''
    const almaBloco = almaContent ? `\n\n## PERSONALIDADE E TOM\nVocê é a pessoa descrita abaixo. Responda SEMPRE no estilo, tom e personalidade dela.\n${almaContent}` : ''

    const materiaisInstrucao = materiaisTexto ? '\n\nVocê recebeu documentos de referência abaixo. ANALISE-OS e USE-OS para responder. Se houver documentos anexados, mencione brevemente o que encontrou neles.' : ''
    const imagensInstrucao = temImagens
      ? '\n\nO usuário anexou imagem(ns) NESTA mensagem. Analise SOMENTE a imagem anexada agora. NUNCA descreva nem mencione imagens da base de conhecimento ou de materiais de referência — elas são apenas contexto de fundo e não foram anexadas agora.'
      : '\n\nSe nenhuma imagem foi anexada nesta mensagem, NUNCA invente nem descreva imagens. Responda apenas com base no texto.'
    let systemPrompt
    if (almaContent || negocioContent) {
      systemPrompt = `Você é a pessoa descrita abaixo. REGRA ABSOLUTA DE TAMANHO: responda NO MÁXIMO 2 frases curtas, claras e diretas. Seja conciso e relevante. NUNCA liste itens, NUNCA use bullet points, NUNCA dê explicações longas. Vá direto ao ponto. Se a pergunta for ampla, dê apenas o essencial.${linguaInstrucao}${almaBloco}${negocioBloco}${materiaisTexto}${materiaisInstrucao}${imagensInstrucao}`
    } else {
      systemPrompt = `Você é um assistente útil. REGRA ABSOLUTA DE TAMANHO: responda NO MÁXIMO 2 frases curtas, claras e diretas. Seja conciso e relevante. NUNCA liste itens, NUNCA use bullet points, NUNCA dê explicações longas. Vá direto ao ponto. Se a pergunta for ampla, dê apenas o essencial.${linguaInstrucao}${materiaisTexto}${materiaisInstrucao}${imagensInstrucao}`
    }

    // Monta mensagens com suporte a visão
    const userContent = temImagens
      ? [{ type: 'text', text: `[IMAGENS ANEXADAS] ${pergunta}\n\nAnalise e descreva as imagens acima de forma natural na sua resposta.` }, ...imagensParaVisao.slice(0, 5).map((img) => ({ type: 'image_url', image_url: { url: img.conteudo } }))]
      : pergunta

    const messages = [
      { role: 'system', content: systemPrompt },
      ...(Array.isArray(historico) ? historico : []),
      { role: 'user', content: userContent },
    ]

    // Chama a API (Groq → NVIDIA fallback)
    const resposta = await completarChat({
      messages,
      modelo,
      modeloNvidia,
      maxTokens: temImagens ? 300 : 90,
    })

    return NextResponse.json({ resposta })
  } catch (error) {
    console.error('Erro no /api/chat:', error)
    return NextResponse.json(
      { erro: error.message || 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
