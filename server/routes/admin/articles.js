const express = require('express');
const router = express.Router();

// Stub routes - to be implemented
router.get('/', (req, res) => {
  res.json({ articles: [], message: 'Admin articles endpoint - not yet implemented' });
});

module.exports = router;
