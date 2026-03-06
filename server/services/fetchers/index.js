const rssFetcher = require('./rssFetcher');
const newsApiOrgFetcher = require('./newsApiOrgFetcher');
const newsApiAiFetcher = require('./newsApiAiFetcher');
const perplexityFetcher = require('./perplexityFetcher');
const manualFetcher = require('./manualFetcher');
const scraperFetcher = require('./scraperFetcher');
const newsletterFetcher = require('./newsletterFetcher');

function notImplemented(sourceType) {
  return async function () {
    throw new Error(`Fetcher not implemented: ${sourceType}`);
  };
}

const fetchers = {
  RSS: rssFetcher.fetch,
  NEWSAPI_ORG: newsApiOrgFetcher.fetch,
  NEWSAPI_AI: newsApiAiFetcher.fetch,
  PERPLEXITY: perplexityFetcher.fetch,
  NEWSLETTER: newsletterFetcher.fetch,
  SCRAPER: scraperFetcher.fetch,
  SOCIAL: notImplemented('SOCIAL'),
  MANUAL: manualFetcher.fetch,
};

function getFetcher(sourceType) {
  const fetcher = fetchers[sourceType];
  if (!fetcher) {
    throw new Error(`Unknown source type: ${sourceType}`);
  }
  return fetcher;
}

module.exports = { getFetcher };
