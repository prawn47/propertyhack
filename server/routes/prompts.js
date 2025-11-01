const express = require('express');
const { authenticateToken, requireSuperAdmin } = require('../middleware/auth');

const router = express.Router();

// Public route to get active template by name (for AI generation)
router.get('/active/:name', async (req, res) => {
  try {
    const template = await req.prisma.promptTemplate.findFirst({
      where: {
        name: req.params.name,
        isActive: true
      }
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Active prompt template not found' });
    }
    
    res.json({ template });
  } catch (error) {
    console.error('Error fetching active prompt template:', error);
    res.status(500).json({ error: 'Failed to fetch prompt template' });
  }
});

// Apply authentication to all routes below
router.use(authenticateToken);
router.use(requireSuperAdmin);

// Get all prompt templates
router.get('/', async (req, res) => {
  try {
    const templates = await req.prisma.promptTemplate.findMany({
      orderBy: { updatedAt: 'desc' }
    });
    res.json({ templates });
  } catch (error) {
    console.error('Error fetching prompt templates:', error);
    res.status(500).json({ error: 'Failed to fetch prompt templates' });
  }
});

// Get single prompt template
router.get('/:id', async (req, res) => {
  try {
    const template = await req.prisma.promptTemplate.findUnique({
      where: { id: req.params.id }
    });
    
    if (!template) {
      return res.status(404).json({ error: 'Prompt template not found' });
    }
    
    res.json({ template });
  } catch (error) {
    console.error('Error fetching prompt template:', error);
    res.status(500).json({ error: 'Failed to fetch prompt template' });
  }
});

// Create route removed - templates are created by developers via seed scripts

// Update prompt template
router.put('/:id', async (req, res) => {
  try {
    const { name, description, template, variables, isActive } = req.body;
    
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (template !== undefined) updateData.template = template;
    if (variables !== undefined) updateData.variables = JSON.stringify(variables);
    if (isActive !== undefined) updateData.isActive = isActive;
    
    const updatedTemplate = await req.prisma.promptTemplate.update({
      where: { id: req.params.id },
      data: updateData
    });
    
    res.json({ template: updatedTemplate });
  } catch (error) {
    console.error('Error updating prompt template:', error);
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Prompt template not found' });
    }
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'Prompt template with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to update prompt template' });
  }
});

// Delete route removed - templates should not be deleted via UI

module.exports = router;
