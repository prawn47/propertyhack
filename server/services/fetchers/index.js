const rssFetcher = require('./rssFetcher');

function notImplemented(sourceType) {
  return async function () {
    throw new Error(`Fetcher not implemented: ${sourceType}`);
  };
}

const fetchers = {
  RSS: rssFetcher.fetch,
  NEWSAPI_ORG: notImplemented('NEWSAPI_ORG'),
  NEWSAPI_AI: notImplemented('NEWSAPI_AI'),
  PERPLEXITY: notImplemented('PERPLEXITY'),
  NEWSLETTER: notImplemented('NEWSLETTER'),
  SCRAPER: notImplemented('SCRAPER'),
  SOCIAL: notImplemented('SOCIAL'),
  MANUAL: notImplemented('MANUAL'),
};

function getFetcher(sourceType) {
  const fetcher = fetchers[sourceType];
  if (!fetcher) {
    throw new Error(`Unknown source type: ${sourceType}`);
  }
  return fetcher;
}

module.exports = { getFetcher };
