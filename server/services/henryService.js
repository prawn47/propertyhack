// Henry AI service — orchestrates RAG retrieval, Gemini streaming, tool calls, and persistence
// Full implementation in T6 (henryService core)

async function* streamResponse({ message, conversationId, user }) {
  yield { event: 'thinking', data: { phase: 'initialising' } };
  yield { event: 'error', data: { message: 'Henry service not yet implemented.' } };
}

module.exports = { streamResponse };
