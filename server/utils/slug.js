const generateSlug = (title) => {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  const suffix = Math.random().toString(36).slice(2, 7);
  return `${base}-${suffix}`;
};

module.exports = { generateSlug };
