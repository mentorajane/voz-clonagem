const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const NVIDIA_URL = 'https://integrate.api.nvidia.com/v1/chat/completions'

async function tentar(provedor, url, apiKey, body) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.ok) {
    const data = await res.json()
    const content = data.choices?.[0]?.message?.content
    if (Array.isArray(content)) {
      return content.map(p => p.text || '').filter(Boolean).join(' ')
    }
    return content || ''
  }
  const erroTexto = await res.text()
  if (res.status === 429) throw Object.assign(new Error(erroTexto), { rateLimit: true, provedor })
  throw new Error(erroTexto)
}

export async function completarChat({ messages, modelo, modeloNvidia, maxTokens = 500 }) {
  const groqKey = process.env.GROQ_API_KEY
  const nvidiaKey = process.env.NVIDIA_API_KEY

  const corpo = { model: '', messages, temperature: 0.5, max_tokens: maxTokens }
  let erros = []

  // Tenta NVIDIA (primário para texto)
  if (nvidiaKey) {
    try {
      corpo.model = modeloNvidia || modelo
      return await tentar('nvidia', NVIDIA_URL, nvidiaKey, { ...corpo })
    } catch (err) {
      erros.push(`Nvidia: ${err.message}`)
    }
  }

  // Fallback Groq
  if (groqKey) {
    try {
      corpo.model = modelo
      return await tentar('groq', GROQ_URL, groqKey, { ...corpo })
    } catch (err) {
      erros.push(`Groq: ${err.message}`)
    }
  }

  throw new Error(erros.join(' | ') || 'Nenhuma API configurada.')
}
