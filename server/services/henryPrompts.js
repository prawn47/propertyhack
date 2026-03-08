const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const MAX_HISTORY_MESSAGES = parseInt(process.env.HENRY_MAX_HISTORY_MESSAGES || '20', 10);

function buildSystemPrompt() {
  const today = new Date().toISOString().split('T')[0];
  return `You are Henry, PropertyHack's property information assistant. You help users understand property news, market trends, and provide general property information for Australia, New Zealand, the United Kingdom, the United States, and Canada.

Today's date: ${today}

RULES:
- You provide general information only — NEVER give direct financial advice
- Always recommend consulting a qualified financial advisor, mortgage broker, or legal professional for personal decisions
- When citing articles, reference them by title and include the link
- When using calculator results, present them conversationally with appropriate caveats (e.g. "this is an estimate based on the inputs provided")
- Be concise but thorough — aim for 2-4 paragraphs unless the question warrants more
- If you don't have relevant information, say so honestly rather than speculating
- Stay focused on property — politely redirect off-topic questions back to property topics
- Use Australian English spelling by default (e.g. "organisation", "centre", "labour"), unless the user's market context suggests otherwise (e.g. use American English for US queries)
- Never mention that you are powered by Gemini or any specific AI model — you are Henry
- Never mention PropertyHack's internal systems, databases, or technical implementation details

TONE:
- Friendly, knowledgeable, neutral
- Like a well-informed property journalist, not a salesperson
- Use plain language — avoid jargon unless the user uses it first`;
}

function buildUserContext(user) {
  if (!user || !user.preferences) return null;

  const prefs = user.preferences;
  const lines = [];

  if (prefs.defaultLocation) {
    lines.push(`User is primarily interested in property in: ${prefs.defaultLocation}`);
  }

  if (prefs.defaultCountry) {
    const marketNames = { AU: 'Australia', NZ: 'New Zealand', UK: 'United Kingdom', US: 'United States', CA: 'Canada' };
    const marketName = marketNames[prefs.defaultCountry] || prefs.defaultCountry;
    lines.push(`User's primary market: ${marketName} (${prefs.defaultCountry})`);
  }

  if (Array.isArray(prefs.defaultCategories) && prefs.defaultCategories.length > 0) {
    lines.push(`User follows these property topics: ${prefs.defaultCategories.join(', ')}`);
  }

  if (lines.length === 0) return null;

  return `USER CONTEXT:\n${lines.join('\n')}`;
}

function buildArticleContext(articles) {
  if (!articles || articles.length === 0) return null;

  const formatted = articles.map((article, i) => {
    const num = i + 1;
    const date = article.publishedAt
      ? new Date(article.publishedAt).toISOString().split('T')[0]
      : 'unknown date';
    const url = article.slug
      ? `https://propertyhack.com.au/articles/${article.slug}`
      : article.sourceUrl || '';
    const summary = article.longSummary || article.shortBlurb || '';

    return `[${num}] "${article.title}"
  Published: ${date}
  Category: ${article.category || 'general'}
  URL: ${url}
  ${summary}`;
  });

  return `RELEVANT ARTICLES FROM PROPERTYHACK:\n${formatted.join('\n\n')}`;
}

function buildCalculatorContext() {
  return `AVAILABLE CALCULATORS:
You can invoke these calculators when the user's question involves numerical estimates. Call the appropriate function and present results conversationally.

- calculate_mortgage: Estimates monthly mortgage repayments given property price, deposit, interest rate, and loan term.
- calculate_borrowing_power: Estimates how much a user can borrow based on income, expenses, and interest rate.
- calculate_stamp_duty: Calculates stamp duty / transfer tax for a given property price, state/region, and buyer type (first home buyer, investor, etc.). Supports AU, UK, US, CA, NZ.
- calculate_rental_yield: Calculates gross and net rental yield for an investment property.
- calculate_rent_vs_buy: Compares the long-term cost of renting vs buying in a given market.
- calculate_buying_costs: Estimates total upfront purchase costs including stamp duty, legal fees, inspections, and other charges.

Always present calculator results with a caveat that figures are estimates only and professional advice should be sought.`;
}

function formatConversationHistory(messages) {
  if (!messages || messages.length === 0) return [];

  const trimmed = messages.slice(-MAX_HISTORY_MESSAGES);

  return trimmed
    .filter(msg => msg.role === 'user' || msg.role === 'assistant')
    .map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
}

async function generateTitle(firstMessage) {
  if (!firstMessage || !firstMessage.trim()) return 'Property conversation';

  const prompt = `Summarise the following question into a short conversation title. Maximum 80 characters. No punctuation at the end. Be specific and descriptive.

Question: ${firstMessage.trim().substring(0, 500)}

Return only the title, nothing else.`;

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const title = response.text().trim().replace(/[.!?]$/, '').substring(0, 80);
    return title || 'Property conversation';
  } catch (error) {
    console.error('[henryPrompts] generateTitle failed:', error.message);
    return firstMessage.trim().substring(0, 80);
  }
}

module.exports = {
  buildSystemPrompt,
  buildUserContext,
  buildArticleContext,
  buildCalculatorContext,
  formatConversationHistory,
  generateTitle,
};
