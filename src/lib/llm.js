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
    return data.choices?.[0]?.message?.content
  }
  const erroTexto = await res.text()
  if (res.status === 429) throw Object.assign(new Error(erroTexto), { rateLimit: true, provedor })
  throw new Error(erroTexto)
}

export async function completarChat({ messages, modelo, modeloNvidia, maxTokens = 500 }) {
  const groqKey = process.env.GROQ_API_KEY
  const nvidiaKey = process.env.NVIDIA_API_KEY

  let erros = []

  // Tenta NVIDIA (primário)
  if (nvidiaKey) {
    try {
      return await tentar('nvidia', NVIDIA_URL, nvidiaKey, { model: modeloNvidia || modelo, messages, temperature: 0.5, max_tokens: maxTokens })
    } catch (err) {
      erros.push(`Nvidia: ${err.message}`)
      if (!err.rateLimit) throw err
    }
  }

  // Fallback Groq
  if (groqKey) {
    try {
      return await tentar('groq', GROQ_URL, groqKey, { model: modelo, messages, temperature: 0.5, max_tokens: maxTokens })
    } catch (err) {
      erros.push(`Groq: ${err.message}`)
      throw err
    }
  }

  throw new Error(`Sem API disponível.\n${erros.join('\n')}`)
}
