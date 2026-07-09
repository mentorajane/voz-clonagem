# 🎙️ Assistente de Voz com IA

Aplicativo web que permite fazer perguntas (por texto) e receber a resposta **em áudio** com a personalidade e o conhecimento de uma pessoa específica.

> 🆓 **100% gratuito** — usa a SpeechSynthesis API do navegador para gerar a voz. Não precisa de chave de TTS, não tem custos.

## Fluxo do App

```
Usuário digita pergunta
       ↓
  Frontend (React)
       ↓
  /api/chat → Groq (LLM com system prompt + base de conhecimento)
       ↓
  Texto da resposta
       ↓
  SpeechSynthesis API do navegador (gratuita, sem custos)
       ↓
  Áudio tocado automaticamente
       ↓
  Conversa salva → Supabase (histórico)
```

## Estrutura dos Arquivos

```
├── base-de-conhecimento.md   ← EDITAR: colar bio, tom de voz, bordões, assuntos
├── .env.local                ← SUAS CHAVES de API (nunca comitar)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── chat/route.js          ← Chama o Groq com o system prompt
│   │   │   └── conversations/route.js ← CRUD no Supabase
│   │   ├── page.js                    ← Página principal (orquestra tudo)
│   │   ├── layout.js                  ← Layout com header/footer
│   │   └── globals.css                ← Estilos Tailwind
│   ├── components/
│   │   ├── ChatInput.js               ← Input + botão "Perguntar"
│   │   ├── AudioPlayer.js             ← Player usando SpeechSynthesis API
│   │   └── ConversationHistory.js     ← Histórico de conversas
│   └── lib/
│       └── supabase.js                ← Cliente Supabase
│   │   ├── page.js                    ← Página principal (orquestra tudo)
│   │   ├── layout.js                  ← Layout com header/footer
│   │   └── globals.css                ← Estilos Tailwind
│   ├── components/
│   │   ├── ChatInput.js               ← Input + botão "Perguntar"
│   │   ├── AudioPlayer.js             ← Player play/pause com progresso
│   │   └── ConversationHistory.js     ← Histórico de conversas
│   └── lib/
│       └── supabase.js                ← Cliente Supabase
├── package.json
├── next.config.mjs
├── tailwind.config.mjs
└── postcss.config.mjs
```

---

## Passo a Passo — Configuração

### 1. Pré-requisitos

- Node.js 18+
- NPM ou Yarn

### 2. Criar conta no Groq (IA)

1. Acesse [console.groq.com](https://console.groq.com) e crie uma conta
2. Vá em **API Keys** → **Create API Key**
3. Copie a chave gerada

### 3. TTS (Voz) — SpeechSynthesis API do navegador

**Não precisa configurar nada!** O app usa a API nativa de síntese de voz do navegador (Web Speech API). É 100% gratuita, funciona offline e não requer chaves, contas ou servidores.

- No **Google Chrome** e **Microsoft Edge** você tem vozes neurais de alta qualidade em português.
- No **Firefox** e **Safari** também funciona, com as vozes disponíveis no sistema.
- Você pode selecionar vozes diferentes no próprio player do app.

> 💡 **Dica:** Para uma voz mais natural, use **Google Chrome** ou **Microsoft Edge** no Windows — eles têm vozes neurais "Microsoft Maria" e "Google português".

### 4. Criar conta no Supabase (Banco — opcional)

1. Acesse [supabase.com](https://supabase.com) e crie uma conta
2. Crie um **novo projeto** (escolha um nome qualquer)
3. Vá em **Settings** → **API**
   - Copie o **Project URL** (ex: `https://abc123.supabase.co`)
   - Copie a **anon public key** (começa com `eyJ...`)
4. Vá em **SQL Editor** → execute o comando abaixo:

```sql
-- Cria a tabela de conversas
CREATE TABLE conversas (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pergunta TEXT NOT NULL,
  resposta TEXT NOT NULL,
  audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Permite leitura e inserção anônima (via anon key)
ALTER TABLE conversas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir leitura anônima"
  ON conversas FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Permitir inserção anônima"
  ON conversas FOR INSERT
  TO anon
  WITH CHECK (true);
```

### 5. Configurar variáveis de ambiente (apenas Groq é obrigatório)

```bash
# Copie o arquivo de exemplo
cp .env.local.example .env.local
```

Edite `.env.local` e preencha:

```env
GROQ_API_KEY=gsk_...           # Sua chave do Groq (obrigatório)
SUPABASE_URL=https://...        # URL do projeto Supabase (opcional)
SUPABASE_ANON_KEY=eyJ...        # Chave anon do Supabase (opcional)
```

### 6. Editar a base de conhecimento

Abra `base-de-conhecimento.md` e preencha com os dados da pessoa que você está clonando:
- Nome, profissão, tom de voz, bordões
- Áreas de conhecimento
- Exemplos de respostas

> Quanto mais detalhado, mais natural a resposta será.

### 7. Instalar e rodar

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento
npm run dev
```

O app abre em **http://localhost:3000** 🚀

### 8. Build para produção

```bash
npm run build
npm start
```

---

## Solução de Problemas

| Problema | Causa provável |
|---|---|
| `GROQ_API_KEY não configurada` | Esqueceu de preencher `.env.local` |
| Áudio não toca | Navegador pode exigir interação do usuário antes de falar — clique no play |
| Voz robótica | Está usando Firefox/Safari sem vozes neurais — experimente Chrome ou Edge |
| Histórico vazio | Supabase não configurado ou tabela não criada (opcional) |

---

## Tecnologias

- **Next.js 14** (App Router) — Frontend + API Routes
- **Tailwind CSS** — Estilo
- **Groq API** — Geração de texto (LLM)
- **Web Speech API (SpeechSynthesis)** — Voz (100% gratuita, nativa do navegador)
- **Supabase** — Banco de dados PostgreSQL (opcional)
