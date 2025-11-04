const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');

// Middleware to check if user is super admin
const requireSuperAdmin = (req, res, next) => {
  if (!req.user?.superAdmin) {
    return res.status(403).json({ error: 'Forbidden: Super admin access required' });
  }
  next();
};

// Apply authentication middleware to all routes
router.use(authenticateToken);
router.use(requireSuperAdmin);

// Get all system prompts
router.get('/system-prompts', async (req, res) => {
  try {
    const prompts = await req.prisma.systemPrompt.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({ prompts });
  } catch (error) {
    console.error('Error fetching system prompts:', error);
    res.status(500).json({ error: 'Failed to fetch system prompts' });
  }
});

// Get a specific system prompt by name
router.get('/system-prompts/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const prompt = await req.prisma.systemPrompt.findUnique({
      where: { name }
    });
    
    if (!prompt) {
      return res.status(404).json({ error: 'System prompt not found' });
    }
    
    res.json({ prompt });
  } catch (error) {
    console.error('Error fetching system prompt:', error);
    res.status(500).json({ error: 'Failed to fetch system prompt' });
  }
});

// Create or update a system prompt
router.put('/system-prompts/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { description, content, isActive } = req.body;
    
    if (!description || content === undefined) {
      return res.status(400).json({ error: 'Description and content are required' });
    }
    
    const prompt = await req.prisma.systemPrompt.upsert({
      where: { name },
      create: {
        name,
        description,
        content,
        isActive: isActive !== undefined ? isActive : true
      },
      update: {
        description,
        content,
        isActive: isActive !== undefined ? isActive : undefined
      }
    });
    
    res.json({ prompt });
  } catch (error) {
    console.error('Error updating system prompt:', error);
    res.status(500).json({ error: 'Failed to update system prompt' });
  }
});

// Delete a system prompt
router.delete('/system-prompts/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    await req.prisma.systemPrompt.delete({
      where: { name }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting system prompt:', error);
    res.status(500).json({ error: 'Failed to delete system prompt' });
  }
});

// Toggle active status
router.patch('/system-prompts/:name/toggle', async (req, res) => {
  try {
    const { name } = req.params;
    
    const current = await req.prisma.systemPrompt.findUnique({
      where: { name }
    });
    
    if (!current) {
      return res.status(404).json({ error: 'System prompt not found' });
    }
    
    const updated = await req.prisma.systemPrompt.update({
      where: { name },
      data: { isActive: !current.isActive }
    });
    
    res.json({ prompt: updated });
  } catch (error) {
    console.error('Error toggling system prompt:', error);
    res.status(500).json({ error: 'Failed to toggle system prompt' });
  }
});

module.exports = router;
