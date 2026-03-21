const express = require('express');
const { body, validationResult } = require('express-validator');
const imageEditService = require('../../services/imageEditService');

const router = express.Router();

function handleValidationErrors(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation error', details: errors.array() });
  }
  return null;
}

// POST /edit — edit an existing image with a prompt
router.post('/edit', [
  body('imageUrl').notEmpty().withMessage('imageUrl is required'),
  body('editPrompt').notEmpty().withMessage('editPrompt is required'),
  body('style').optional().isString(),
  body('aspectRatio').optional().isString(),
], async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  try {
    const { imageUrl, editPrompt, style, aspectRatio } = req.body;
    const result = await imageEditService.editImage(imageUrl, editPrompt, style, aspectRatio);
    res.json(result);
  } catch (err) {
    console.error('[images/edit] Error:', err.message);
    res.status(500).json({ error: 'Image editing failed', message: err.message });
  }
});

// POST /generate — generate a new image from scratch
router.post('/generate', [
  body('prompt').notEmpty().withMessage('prompt is required'),
  body('style').optional().isString(),
  body('aspectRatio').optional().isString(),
  body('context').optional().isObject(),
], async (req, res) => {
  const validationError = handleValidationErrors(req, res);
  if (validationError) return;

  try {
    const { prompt, style, aspectRatio, context } = req.body;
    const result = await imageEditService.generateImageWithMetadata(prompt, style, aspectRatio, context);
    res.json(result);
  } catch (err) {
    console.error('[images/generate] Error:', err.message);
    res.status(500).json({ error: 'Image generation failed', message: err.message });
  }
});

module.exports = router;
