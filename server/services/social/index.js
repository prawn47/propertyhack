const twitter = require('./twitterAdapter');
const facebook = require('./facebookAdapter');
const instagram = require('./instagramAdapter');

const adapters = { twitter, facebook, instagram };

function getAdapter(platform) {
  const adapter = adapters[platform];
  if (!adapter) throw new Error(`Unknown platform: ${platform}`);
  return adapter;
}

function previewAll(post, platforms) {
  return platforms.map((p) => ({ platform: p, ...getAdapter(p).preview(post) }));
}

module.exports = { getAdapter, previewAll };
