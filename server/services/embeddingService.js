const OpenAI = require('openai')

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

async function generateEmbedding(text) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not configured')
  }

  const truncatedText = text.substring(0, 30000)

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: truncatedText,
    dimensions: 1536
  })

  return response.data[0].embedding
}

module.exports = { generateEmbedding }
