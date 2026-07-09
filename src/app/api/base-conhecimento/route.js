import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const key = searchParams.get('key') || 'base_conhecimento'
    const { data, error } = await supabase
      .from('config')
      .select('value')
      .eq('key', key)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ value: '' })
    }

    return NextResponse.json({ value: data?.value || '' })
  } catch {
    return NextResponse.json({ value: '' })
  }
}

export async function PUT(request) {
  try {
    const { value, key: chave } = await request.json()
    const k = chave || 'base_conhecimento'

    if (typeof value !== 'string') {
      return NextResponse.json({ erro: 'Campo "value" é obrigatório.' }, { status: 400 })
    }

    const { data: existente } = await supabase
      .from('config')
      .select('key')
      .eq('key', k)
      .maybeSingle()

    let error
    if (existente) {
      const { error: e } = await supabase
        .from('config')
        .update({ value, updated_at: new Date().toISOString() })
        .eq('key', k)
      error = e
    } else {
      const { error: e } = await supabase
        .from('config')
        .insert({ key: k, value, updated_at: new Date().toISOString() })
      error = e
    }

    if (error) {
      console.error('Erro ao salvar base:', error.message, error.code)
      return NextResponse.json({ erro: error.message, code: error.code }, { status: 500 })
    }

    return NextResponse.json({ sucesso: true })
  } catch (error) {
    console.error('Erro interno PUT /api/base-conhecimento:', error)
    return NextResponse.json({ erro: 'Erro interno do servidor.' }, { status: 500 })
  }
}
