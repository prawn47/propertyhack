const express = require('express');
const router = express.Router();
const { fetchAustralianPropertyNews } = require('../../services/newsApiService');
const { articleProcessingQueue } = require('../../queues/articleProcessingQueue');
const { authenticateToken } = require('../../middleware/auth');

// Trigger manual news fetch
router.post('/', authenticateToken, async (req, res) => {
  try {
    const apiKey = process.env.NEWSAPI_API_KEY || process.env.NEWSAPI_KEY;
    
    if (!apiKey) {
      return res.status(500).json({ error: 'NewsAPI key not configured' });
    }
    
    console.log('[News Fetch] Manual trigger requested');
    
    // Fetch articles from NewsAPI
    const articles = await fetchAustralianPropertyNews(apiKey);
    
    if (articles.length === 0) {
      return res.json({ message: 'No articles found', count: 0 });
    }
    
    // Queue each article for AI processing
    let queued = 0;
    for (const article of articles) {
      try {
        await articleProcessingQueue.add('process-article', {
          article,
          userId: req.user.id,
        });
        queued++;
      } catch (err) {
        console.error(`Failed to queue article: ${article.title}`, err.message);
      }
    }
    
    console.log(`✅ Queued ${queued} articles for processing`);
    
    res.json({
      success: true,
      message: `Fetched ${articles.length} articles, queued ${queued} for processing`,
      count: articles.length,
      queued,
    });
    
  } catch (error) {
    console.error('[News Fetch] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
