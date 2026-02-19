import { Router } from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = Router();

const PROMPT_FILES = {
  discovery: 'prompts/discovery.md',
  editorial: 'prompts/editorial.md',
  writing: 'prompts/writing.md',
  image: 'prompts/image.md',
};

// Get all prompts
router.get('/', async (req, res) => {
  try {
    const prompts: Record<string, string> = {};

    for (const [name, filePath] of Object.entries(PROMPT_FILES)) {
      const fullPath = path.join(process.cwd(), filePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      prompts[name] = content;
    }

    res.json({ prompts });
  } catch (error) {
    console.error('Error reading prompts:', error);
    res.status(500).json({ error: 'Failed to read prompts' });
  }
});

// Get single prompt
router.get('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const filePath = PROMPT_FILES[name as keyof typeof PROMPT_FILES];

    if (!filePath) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    const fullPath = path.join(process.cwd(), filePath);
    const content = await fs.readFile(fullPath, 'utf-8');

    res.json({ name, content });
  } catch (error) {
    console.error('Error reading prompt:', error);
    res.status(500).json({ error: 'Failed to read prompt' });
  }
});

// Update prompt
router.put('/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { content } = req.body;

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required' });
    }

    const filePath = PROMPT_FILES[name as keyof typeof PROMPT_FILES];

    if (!filePath) {
      return res.status(404).json({ error: 'Prompt not found' });
    }

    const fullPath = path.join(process.cwd(), filePath);
    await fs.writeFile(fullPath, content, 'utf-8');

    res.json({ success: true, name, message: 'Prompt updated successfully' });
  } catch (error) {
    console.error('Error updating prompt:', error);
    res.status(500).json({ error: 'Failed to update prompt' });
  }
});

export default router;
