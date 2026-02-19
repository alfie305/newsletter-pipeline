import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs/promises';
import path from 'path';

export class GeminiVisionService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor(apiKey: string) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-pro' });
  }

  async analyzeStyleReferences(imagePaths: string[]): Promise<string> {
    // Load images as base64
    const imageParts = await Promise.all(
      imagePaths.map(async (imagePath) => {
        const imageData = await fs.readFile(imagePath);
        return {
          inlineData: {
            data: imageData.toString('base64'),
            mimeType: this.getMimeType(imagePath)
          }
        };
      })
    );

    const prompt = `Analyze these reference images and extract their visual style characteristics for use in image generation prompts.

Focus on:
- Overall aesthetic and mood
- Color palette and grading
- Lighting style and quality
- Composition approach
- Level of detail and sharpness
- Photographic style (editorial, commercial, documentary, etc.)
- Any distinctive visual signatures

Return a concise 2-3 sentence description that can be appended to image generation prompts to maintain visual consistency. Be specific about visual elements but concise.

Example output: "Professional real estate photography with warm golden hour lighting, clean modern architecture, professional color grading with earth tones and sky blues, ultra-sharp details with shallow depth of field, magazine-quality composition"`;

    const result = await this.model.generateContent([prompt, ...imageParts]);
    return result.response.text();
  }

  private getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };
    return mimeTypes[ext] || 'image/jpeg';
  }
}
