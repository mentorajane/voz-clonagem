// ============================================
// API Route: /api/conversations
// Gerencia o histórico de conversas no Supabase
// GET  → lista as conversas
// POST → salva uma nova conversa
// ============================================
import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('conversas')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Erro ao buscar conversas:', error)
      return NextResponse.json(
        { erro: 'Erro ao buscar histórico.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ conversas: data || [] })
  } catch (error) {
    console.error('Erro interno GET /api/conversations:', error)
    return NextResponse.json(
      { erro: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  try {
    const body = await request.json()
    const { pergunta, resposta, lingua } = body

    if (!pergunta || !resposta) {
      return NextResponse.json(
        { erro: 'Campos "pergunta" e "resposta" são obrigatórios.' },
        { status: 400 }
      )
    }

    // Salva no Supabase (lingua só é salva se a coluna existir)
    const { data, error } = await supabase
      .from('conversas')
      .insert([{ pergunta, resposta, created_at: new Date().toISOString() }])
      .select()
    // Se o insert funcionou, tenta atualizar a lingua separadamente
    if (!error && lingua && data?.[0]?.id) {
      await supabase.from('conversas').update({ lingua }).eq('id', data[0].id).catch(() => {})
    }

    if (error) {
      console.error('Erro ao salvar conversa:', error)
      return NextResponse.json(
        { erro: 'Erro ao salvar conversa.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ conversa: data?.[0] }, { status: 201 })
  } catch (error) {
    console.error('Erro interno POST /api/conversations:', error)
    return NextResponse.json(
      { erro: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const tudo = searchParams.get('tudo')

    if (tudo === 'true') {
      const { error } = await supabase.from('conversas').delete().neq('id', '0')
      if (error) {
        console.error('Erro ao limpar histórico:', error)
        return NextResponse.json({ erro: 'Erro ao limpar histórico.' }, { status: 500 })
      }
      return NextResponse.json({ sucesso: true })
    }

    if (!id) {
      return NextResponse.json(
        { erro: 'Parâmetro "id" ou "tudo" é obrigatório.' },
        { status: 400 }
      )
    }

    const { error } = await supabase
      .from('conversas')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Erro ao deletar conversa:', error)
      return NextResponse.json(
        { erro: 'Erro ao deletar conversa.' },
        { status: 500 }
      )
    }

    return NextResponse.json({ sucesso: true })
  } catch (error) {
    console.error('Erro interno DELETE /api/conversations:', error)
    return NextResponse.json(
      { erro: 'Erro interno do servidor.' },
      { status: 500 }
    )
  }
}
