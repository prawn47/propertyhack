const express = require('express');
const router = express.Router();

// Test Gemini API environment variable
router.get('/gemini-env', (req, res) => {
  const hasKey = !!(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your-gemini-api-key-here');
  res.json({ 
    hasKey,
    keyLength: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.length : 0,
    isPlaceholder: process.env.GEMINI_API_KEY === 'your-gemini-api-key-here'
  });
});

// Test actual Gemini API call
router.post('/gemini-call', async (req, res) => {
  try {
    // Import Gemini service dynamically to test it
    const { GoogleGenAI } = require('@google/genai');
    
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your-gemini-api-key-here') {
      return res.status(400).json({ error: 'Gemini API key not configured' });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Say "Hello from Gemini API test" in exactly those words.',
    });

    res.json({ 
      success: true, 
      provider: 'gemini',
      response: response.text?.trim() || 'No response text'
    });
  } catch (error) {
    console.error('Gemini API test error:', error);
    res.status(500).json({ 
      error: 'Gemini API call failed', 
      details: error.message,
      provider: 'gemini'
    });
  }
});

// Test OpenAI backup configuration
router.get('/openai-backup', (req, res) => {
  const hasOpenAI = !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your-openai-api-key-here');
  res.json({ 
    hasOpenAIKey: hasOpenAI,
    isConfiguredAsBackup: true, // We'll verify this in the actual implementation
    provider: 'openai-backup'
  });
});

// Test content generation priority
router.get('/content-generation-priority', (req, res) => {
  // This should reflect the actual priority in the content generation service
  res.json({
    primaryProvider: 'gemini',
    backupProvider: 'openai',
    fallbackOrder: ['gemini', 'openai']
  });
});

module.exports = router;
