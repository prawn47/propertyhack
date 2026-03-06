const rssFetcher = require('./rssFetcher');
const newsApiOrgFetcher = require('./newsApiOrgFetcher');
const manualFetcher = require('./manualFetcher');

function notImplemented(sourceType) {
  return async function () {
    throw new Error(`Fetcher not implemented: ${sourceType}`);
  };
}

const fetchers = {
  RSS: rssFetcher.fetch,
  NEWSAPI_ORG: newsApiOrgFetcher.fetch,
  NEWSAPI_AI: notImplemented('NEWSAPI_AI'),
  PERPLEXITY: notImplemented('PERPLEXITY'),
  NEWSLETTER: notImplemented('NEWSLETTER'),
  SCRAPER: notImplemented('SCRAPER'),
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
