const express = require('express');
const router = express.Router();

// Stub routes - to be implemented
router.get('/', (req, res) => {
  res.json({ message: 'Admin meta endpoint - not yet implemented' });
});

module.exports = router;
