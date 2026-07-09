import { NextResponse } from 'next/server'

export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    return NextResponse.json({ erro: 'TELEGRAM_BOT_TOKEN não configurado.' }, { status: 500 })
  }

  const webhookUrl = 'https://assistente-voz-clonagem.vercel.app/api/telegram/webhook'

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook?url=${webhookUrl}`, {
      method: 'GET',
    })
    const data = await res.json()
    return NextResponse.json(data)
  } catch (err) {
    return NextResponse.json({ erro: err.message }, { status: 500 })
  }
}
