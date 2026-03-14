/**
 * Image serving route — serves images from R2 on CF Workers
 * ============================================================
 *
 * On CF Workers, images stored in R2 can't be served via express.static().
 * This route handles /images/* requests by fetching from the R2 bucket.
 *
 * On local dev, express.static() in index.js handles image serving as before.
 * This route only activates when running on CF Workers (R2 bucket is available).
 *
 * Mount this BEFORE express.static('/images', ...) in index.js so R2 takes
 * priority when available.
 *
 * Ref: Beads workspace-8i6
 */
const express = require('express');
const router = express.Router();

router.get('/images/*', async (req, res, next) => {
  const r2Bucket = globalThis.__cf_env?.IMAGES_BUCKET;

  if (!r2Bucket) {
    // Not on CF Workers — fall through to express.static
    return next();
  }

  // Extract the key from the URL path: /images/articles/foo.png → articles/foo.png
  const key = req.path.replace(/^\/images\//, '');

  if (!key) {
    return res.status(404).json({ error: 'Image not found' });
  }

  try {
    const object = await r2Bucket.get(key);

    if (!object) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Set content type from R2 metadata or guess from extension
    const contentType = object.httpMetadata?.contentType
      || (key.endsWith('.jpg') || key.endsWith('.jpeg') ? 'image/jpeg' : 'image/png');

    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400'); // 24h cache
    res.set('ETag', object.httpEtag);

    // Stream the R2 object body to the response
    const arrayBuffer = await object.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error(`[images] R2 error for key "${key}":`, err.message);
    res.status(500).json({ error: 'Failed to serve image' });
  }
});

module.exports = router;
