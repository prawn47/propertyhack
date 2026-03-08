'use strict';

const { GoogleGenerativeAI } = require('@google/generative-ai');
const { generateEmbedding } = require('./embeddingService');
const { buildSystemPrompt, buildUserContext, buildArticleContext, buildCalculatorContext, formatConversationHistory, generateTitle } = require('./henryPrompts');
const { getToolDeclarations, executeToolCall } = require('./henryTools');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MAX_ARTICLES = parseInt(process.env.HENRY_MAX_ARTICLES || '10', 10);
const SIMILARITY_THRESHOLD = parseFloat(process.env.HENRY_SIMILARITY_THRESHOLD || '0.3');
const MAX_HISTORY_MESSAGES = parseInt(process.env.HENRY_MAX_HISTORY_MESSAGES || '20', 10);

async function retrieveArticles(embedding, { market, location, limit = MAX_ARTICLES, threshold = SIMILARITY_THRESHOLD, prisma }) {
  const embeddingStr = `[${embedding.join(',')}]`;

  const conditions = [
    `a.status = 'PUBLISHED'`,
    `a.embedding IS NOT NULL`,
    `1 - (a.embedding <=> $1::vector) > ${threshold}`,
  ];

  const params = [embeddingStr];
  let paramIdx = 2;

  if (market) {
    conditions.push(`(a.market = $${paramIdx} OR a.is_evergreen = true OR a.is_global = true)`);
    params.push(market.toUpperCase());
    paramIdx++;
  }

  if (location) {
    conditions.push(`LOWER(a.location) LIKE LOWER($${paramIdx})`);
    params.push(`%${location}%`);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');

  const rows = await prisma.$queryRawUnsafe(
    `SELECT
      a.id,
      a.title,
      a.short_blurb as "shortBlurb",
      a.long_summary as "longSummary",
      a.slug,
      a.published_at as "publishedAt",
      a.source_url as "sourceUrl",
      a.category,
      a.market,
      1 - (a.embedding <=> $1::vector) as similarity,
      CASE
        WHEN a.published_at >= NOW() - INTERVAL '7 days' THEN 1.2
        WHEN a.published_at >= NOW() - INTERVAL '30 days' THEN 1.0
        ELSE 0.8
      END as recency_weight
    FROM articles a
    WHERE ${whereClause}
    ORDER BY (1 - (a.embedding <=> $1::vector)) *
      CASE
        WHEN a.published_at >= NOW() - INTERVAL '7 days' THEN 1.2
        WHEN a.published_at >= NOW() - INTERVAL '30 days' THEN 1.0
        ELSE 0.8
      END DESC
    LIMIT ${limit}`,
    ...params
  );

  return rows.map(row => ({
    id: row.id,
    title: row.title,
    shortBlurb: row.shortBlurb,
    longSummary: row.longSummary,
    slug: row.slug,
    publishedAt: row.publishedAt,
    sourceUrl: row.sourceUrl,
    category: row.category,
    market: row.market,
    similarity: parseFloat(row.similarity),
  }));
}

async function* streamResponse({ message, conversationId, user, prisma }) {
  const fullResponse = { text: '', citations: [], calculatorCall: null, tokenCount: 0 };

  try {
    // 1. Load conversation history
    let history = [];
    if (conversationId) {
      const messages = await prisma.message.findMany({
        where: { conversationId },
        orderBy: { createdAt: 'asc' },
        take: MAX_HISTORY_MESSAGES,
      });
      history = messages;
    }

    // 2. Build user context
    const preferences = user?.preferences || {};
    const market = preferences.defaultCountry || null;
    const location = preferences.defaultLocation || null;

    // 3. Generate embedding + retrieve articles
    yield { event: 'thinking', data: { phase: 'searching_articles' } };

    let articles = [];
    let embeddingFailed = false;

    try {
      const embedding = await generateEmbedding(message);
      articles = await retrieveArticles(embedding, { market, location, prisma });
    } catch (err) {
      embeddingFailed = true;
      console.error('[Henry] Embedding/retrieval failed:', err.message);
      yield { event: 'thinking', data: { phase: 'article_search_skipped' } };
    }

    // 4. Construct Gemini prompt
    yield { event: 'thinking', data: { phase: 'generating_response' } };

    const systemPromptText = buildSystemPrompt();
    const userContextText = buildUserContext(user);
    const articleContextText = buildArticleContext(articles, embeddingFailed);
    const calculatorContextText = buildCalculatorContext();
    const historyMessages = formatConversationHistory(history);

    const systemInstruction = [
      systemPromptText,
      userContextText,
      articleContextText,
      calculatorContextText,
    ].filter(Boolean).join('\n\n');

    // 5. Call Gemini with streaming + function calling
    const tools = getToolDeclarations();
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction,
      tools: tools.length > 0 ? [{ functionDeclarations: tools }] : undefined,
    });

    const chatHistory = historyMessages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({ history: chatHistory });

    let currentMessage = message;
    let toolCallResult = null;
    let toolEventData = null;
    let loopCount = 0;
    const MAX_TOOL_LOOPS = 5;
    const GEMINI_TIMEOUT_MS = 60000;

    while (loopCount < MAX_TOOL_LOOPS) {
      loopCount++;

      const streamResult = await Promise.race([
        chat.sendMessageStream(
          toolCallResult
            ? [{ functionResponse: { name: toolCallResult.name, response: toolCallResult.response } }]
            : currentMessage
        ),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Gemini stream timed out')), GEMINI_TIMEOUT_MS)
        ),
      ]);

      toolCallResult = null;
      let pendingFunctionCall = null;

      for await (const chunk of streamResult.stream) {
        const candidate = chunk.candidates?.[0];
        if (!candidate) continue;

        for (const part of candidate.content?.parts || []) {
          if (part.text) {
            fullResponse.text += part.text;
            yield { event: 'delta', data: { text: part.text } };
          }

          if (part.functionCall) {
            pendingFunctionCall = part.functionCall;
          }
        }

        // Accumulate token count from usage metadata
        if (chunk.usageMetadata?.totalTokenCount) {
          fullResponse.tokenCount = chunk.usageMetadata.totalTokenCount;
        }
      }

      if (pendingFunctionCall) {
        try {
          const toolResult = await executeToolCall(pendingFunctionCall.name, pendingFunctionCall.args, { user });

          toolCallResult = {
            name: pendingFunctionCall.name,
            response: toolResult.outputs,
          };

          toolEventData = {
            type: toolResult.type,
            inputs: toolResult.inputs,
            outputs: toolResult.outputs,
          };

          fullResponse.calculatorCall = toolEventData;
          yield { event: 'calculator', data: toolEventData };
        } catch (toolErr) {
          console.error('[Henry] Tool call failed:', toolErr.message);
          yield {
            event: 'calculator',
            data: {
              type: pendingFunctionCall.name.replace('calculate_', ''),
              inputs: pendingFunctionCall.args || {},
              outputs: null,
              error: "I wasn't able to run that calculation — you can try it directly at the calculator.",
            },
          };
          // Break out of loop — Gemini will respond without calculator result
          break;
        }
      } else {
        // No function call — streaming complete
        break;
      }
    }

    // Emit citations for retrieved articles referenced in response
    for (const article of articles) {
      if (article.similarity >= SIMILARITY_THRESHOLD) {
        const citationData = {
          articleId: article.id,
          title: article.title,
          slug: article.slug,
          similarity: article.similarity,
        };
        fullResponse.citations.push(citationData);
        yield { event: 'citation', data: citationData };
      }
    }

    // 6. Persist messages if conversationId provided and user is authenticated
    let savedMessageId = null;

    if (conversationId && user) {
      try {
        await prisma.message.create({
          data: {
            conversationId,
            role: 'user',
            content: message,
          },
        });

        const assistantMsg = await prisma.message.create({
          data: {
            conversationId,
            role: 'assistant',
            content: fullResponse.text,
            citations: fullResponse.citations.length > 0 ? fullResponse.citations : undefined,
            calculatorCall: fullResponse.calculatorCall || undefined,
            tokenCount: fullResponse.tokenCount || undefined,
          },
        });

        savedMessageId = assistantMsg.id;

        // Generate title if this is the first exchange
        const msgCount = await prisma.message.count({ where: { conversationId } });
        if (msgCount <= 2) {
          try {
            const title = await generateTitle(message);
            await prisma.conversation.update({
              where: { id: conversationId },
              data: { title },
            });
          } catch (titleErr) {
            console.error('[Henry] Title generation failed:', titleErr.message);
          }
        }

        await prisma.conversation.update({
          where: { id: conversationId },
          data: { updatedAt: new Date() },
        });
      } catch (persistErr) {
        console.error('[Henry] Failed to persist messages:', persistErr.message);
      }
    }

    yield {
      event: 'done',
      data: {
        messageId: savedMessageId,
        tokenCount: fullResponse.tokenCount,
        citations: fullResponse.citations,
      },
    };
  } catch (err) {
    console.error('[Henry] streamResponse error:', err.message);
    yield { event: 'error', data: { message: "I'm having trouble thinking right now. Please try again in a moment." } };
  }
}

module.exports = { streamResponse, retrieveArticles };
