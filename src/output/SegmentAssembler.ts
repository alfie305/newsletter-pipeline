import fs from 'fs/promises';
import { NewsletterContent, ImageResult } from '../pipeline/types';
import logger from '../utils/logger';

/**
 * Assembles the final segmented HTML output for Beehiiv in modern format
 */
export class SegmentAssembler {
  /**
   * Generate the complete newsletter HTML
   */
  async assemble(
    newsletterContent: NewsletterContent,
    imageResult: ImageResult,
    editionDate: string,
    outputPath: string
  ): Promise<void> {
    logger.info('Starting HTML assembly', { outputPath });

    const html = this.buildHTML(newsletterContent, imageResult, editionDate);
    await fs.writeFile(outputPath, html, 'utf-8');

    logger.info('HTML assembly completed', { outputPath });
  }

  private getEditionIdFromPath(outputPath: string): string {
    // Extract edition ID from path like "data/editions/2026-02-19/output.html"
    const match = outputPath.match(/editions\/([^/]+)\//);
    return match ? match[1] : '';
  }

  private buildHTML(
    content: NewsletterContent,
    imageResult: ImageResult,
    editionDate: string
  ): string {
    const storySegments = content.segments.stories
      .map((story, idx) => this.buildStorySegment(story, idx + 1, imageResult, editionDate))
      .join('\n\n');

    const quickHitsHTML = content.segments.quick_hits
      .map(
        (hit) => `        <li><strong>${hit.title_bold}:</strong> ${hit.body} <a href="${hit.source_url}" style="font-family: Helvetica, Arial, sans-serif; color: #f59e0b; text-decoration: underline;">${hit.source_label}</a></li>`
      )
      .join('\n');

    const deepSpaceSegment = content.segments.deep_space
      ? this.buildDeepSpaceSegment(content.segments.deep_space, imageResult, editionDate)
      : '';

    const rundownItems = content.segments.intro.rundown_items
      .map((item) => `        <li>${item}</li>`)
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Space Pulse — Copy Segments</title>
  <style>

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: Helvetica, Arial, -apple-system, sans-serif;
      max-width: 680px;
      margin: 40px auto;
      padding: 0 20px;
      background: #f5f5f4;
      color: #1a1a1a;
    }

    .page-header {
      text-align: center;
      margin-bottom: 12px;
    }
    .page-header h1 {
      font-size: 18px;
      font-weight: 800;
      color: #0a0a0a;
      letter-spacing: -0.3px;
    }
    .page-header p {
      font-size: 12px;
      color: #888;
      margin-top: 4px;
    }

    .instructions {
      text-align: center;
      font-size: 12px;
      color: #999;
      margin-bottom: 32px;
      line-height: 1.6;
      background: #fff;
      border: 1px dashed #ddd;
      border-radius: 8px;
      padding: 14px 20px;
    }
    .instructions strong { color: #555; }
    .instructions code {
      background: #f0f0f0;
      padding: 1px 5px;
      border-radius: 3px;
      font-size: 11px;
    }

    .copy-all-bar {
      display: flex;
      justify-content: center;
      gap: 10px;
      margin-bottom: 28px;
    }
    .copy-all-btn {
      background: #0a0a0a;
      color: #fff;
      border: none;
      font-size: 12px;
      font-weight: 600;
      padding: 10px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-family: Helvetica, Arial, sans-serif;
      transition: all 0.2s;
    }
    .copy-all-btn:hover { background: #333; }
    .copy-all-btn.copied { background: #22c55e; }

    .segment {
      background: #ffffff;
      border: 2px solid #e5e5e5;
      border-radius: 10px;
      padding: 28px 24px;
      margin-bottom: 24px;
      position: relative;
      transition: border-color 0.2s;
    }
    .segment:hover { border-color: #f59e0b; }

    .segment-label {
      position: absolute;
      top: -11px;
      left: 16px;
      background: #f59e0b;
      color: white;
      font-size: 10px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 4px;
      letter-spacing: 0.8px;
      text-transform: uppercase;
      pointer-events: none;
    }

    .segment-label.header-label { background: #0a0a0a; }
    .segment-label.story-label { background: #f59e0b; }
    .segment-label.ad-label { background: #f59e0b; color: #000; }
    .segment-label.quickhits-label { background: #10b981; }
    .segment-label.deepspace-label { background: #8b5cf6; }
    .segment-label.closing-label { background: #64748b; }

    .copy-buttons {
      position: absolute;
      top: -11px;
      right: 16px;
      display: flex;
      gap: 6px;
    }
    .copy-btn {
      background: #1a1a1a;
      color: white;
      border: none;
      font-size: 10px;
      font-weight: 600;
      padding: 4px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-family: Helvetica, Arial, sans-serif;
      transition: all 0.15s;
    }
    .copy-btn:hover { background: #444; }
    .copy-btn.copied { background: #22c55e; }
    .copy-btn.html { background: #f59e0b; }
    .copy-btn.html:hover { background: #5558e0; }

    .segment-content h1 {
      font-size: 24px;
      font-weight: 800;
      margin: 0 0 4px 0;
      letter-spacing: -0.5px;
    }
    .segment-content h2 {
      font-size: 20px;
      font-weight: 700;
      margin: 0 0 14px 0;
      letter-spacing: -0.3px;
      line-height: 1.3;
    }
    .segment-content h3 {
      font-size: 14px;
      font-weight: 700;
      margin: 18px 0 6px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #f59e0b;
    }
    .segment-content p {
      font-size: 15px;
      line-height: 1.7;
      margin: 0 0 12px 0;
      color: #2a2a2a;
    }
    .segment-content ul {
      margin: 8px 0 14px 0;
      padding-left: 22px;
    }
    .segment-content li {
      font-size: 15px;
      line-height: 1.65;
      margin-bottom: 8px;
      color: #2a2a2a;
    }
    .segment-content a { color: #f59e0b; text-decoration: underline; }
    .segment-content strong { font-weight: 700; }
    .segment-content em { font-style: italic; color: #555; }

    .subtitle {
      font-size: 14px;
      color: #666;
      margin: 0;
    }

    .img-placeholder {
      background: linear-gradient(135deg, #1e1b4b, #312e81, #1e1b4b);
      border-radius: 8px;
      height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      position: relative;
      overflow: hidden;
    }
    .img-placeholder::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(circle at 30% 50%, rgba(99,102,241,0.3), transparent 60%);
    }
    .img-placeholder span {
      color: rgba(255,255,255,0.5);
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      z-index: 1;
    }

    .story-header {
      display: flex;
      gap: 6px;
      align-items: center;
      margin-bottom: 6px;
    }
    .story-number {
      background: #0a0a0a;
      color: #fff;
      font-size: 11px;
      font-weight: 700;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .story-category {
      font-size: 11px;
      font-weight: 600;
      color: #f59e0b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .tldr-box {
      background: #f8f8f8;
      border-left: 3px solid #f59e0b;
      padding: 10px 14px;
      margin: 12px 0;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
    }

    .read-more {
      display: inline-block;
      font-size: 13px;
      font-weight: 600;
      color: #f59e0b;
      text-decoration: none;
      margin-top: 4px;
    }
    .read-more:hover { text-decoration: underline; }

    .sponsor-placeholder {
      background: linear-gradient(135deg,#f59e0b22,#f59e0b11);
      border: 2px dashed #f59e0b;
      padding: 40px;
      text-align: center;
      border-radius: 8px;
      height: 160px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 8px;
    }
    .sponsor-placeholder span {
      color: #f59e0b;
      font-size: 12px;
      font-weight: 600;
    }

    .divider {
      border: none;
      border-top: 1px solid #e5e5e5;
      margin: 16px 0;
    }

    .footer-note {
      text-align: center;
      font-size: 11px;
      color: #bbb;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #eee;
    }
  </style>
</head>
<body>

  <div class="page-header">
    <h1>🛰️ Space Pulse — Beehiiv Segments</h1>
    <p>${editionDate}</p>
  </div>

  <div class="instructions">
    <strong>Copy Text</strong> → Paste into Beehiiv text blocks (preserves links, bold, bullets).<br>
    <strong>Copy HTML</strong> → Paste into Beehiiv Custom HTML blocks (raw source code).<br>
    Replace <code>{{IMAGE}}</code> placeholders with Nano Banana generated images.
  </div>

  <div class="copy-all-bar">
    <button class="copy-all-btn" onclick="copyAll()">📋 Copy Entire Newsletter</button>
  </div>

  <!-- SEGMENT 0: HEADER -->
  <div class="segment" id="seg-0">
    <span class="segment-label header-label">HEADER</span>
    <div class="copy-buttons">
      <button class="copy-btn" onclick="copySegmentText(0)">Copy Text</button>
      <button class="copy-btn html" onclick="copySegmentHTML(0)">Copy HTML</button>
    </div>
    <div class="segment-content" id="content-0" style="font-family: Helvetica, Arial, sans-serif;">
      <h1>${content.segments.header.title}</h1>
      <p class="subtitle">${content.segments.header.subtitle}</p>
    </div>
  </div>

  <!-- SEGMENT 1: INTRO + RUNDOWN -->
  <div class="segment" id="seg-1">
    <span class="segment-label header-label">INTRO + RUNDOWN</span>
    <div class="copy-buttons">
      <button class="copy-btn" onclick="copySegmentText(1)">Copy Text</button>
      <button class="copy-btn html" onclick="copySegmentHTML(1)">Copy HTML</button>
    </div>
    <div class="segment-content" id="content-1" style="font-family: Helvetica, Arial, sans-serif;">
      ${content.segments.intro.hook}
      <p><strong>In this week's Space Pulse:</strong></p>
      <ul>
${rundownItems}
      </ul>
    </div>
  </div>

  ${storySegments}

  <!-- SPONSOR SLOT -->
  <div class="segment" id="seg-sponsor">
    <span class="segment-label ad-label">SPONSOR SLOT</span>
    <div class="copy-buttons">
      <button class="copy-btn" onclick="copySegmentText('sponsor')">Copy Text</button>
      <button class="copy-btn html" onclick="copySegmentHTML('sponsor')">Copy HTML</button>
    </div>
    <div class="segment-content" id="content-sponsor" style="font-family: Helvetica, Arial, sans-serif;">
      <p style="text-align:center; font-size:11px; color:#999; text-transform:uppercase; letter-spacing:1px; margin-bottom:12px;">Presented by [Sponsor Name]</p>
      <div class="sponsor-placeholder">
        <span>{{SPONSOR_IMAGE}}</span>
        <span style="font-size:10px;">Replace with sponsor creative</span>
      </div>
      <p><strong>[Sponsor headline goes here]</strong></p>
      <p>[Sponsor body copy — 2-3 sentences max. Include CTA link below.]</p>
      <p><a href="#">Learn more →</a></p>
    </div>
  </div>

  <!-- QUICK HITS -->
  <div class="segment" id="seg-quickhits">
    <span class="segment-label quickhits-label">⚡ QUICK HITS</span>
    <div class="copy-buttons">
      <button class="copy-btn" onclick="copySegmentText('quickhits')">Copy Text</button>
      <button class="copy-btn html" onclick="copySegmentHTML('quickhits')">Copy HTML</button>
    </div>
    <div class="segment-content" id="content-quickhits" style="font-family: Helvetica, Arial, sans-serif;">
      <h2>⚡ Quick Hits</h2>
      <ul>
${quickHitsHTML}
      </ul>
    </div>
  </div>

  ${deepSpaceSegment}

  <!-- CLOSING -->
  <div class="segment" id="seg-closing">
    <span class="segment-label closing-label">CLOSING</span>
    <div class="copy-buttons">
      <button class="copy-btn" onclick="copySegmentText('closing')">Copy Text</button>
      <button class="copy-btn html" onclick="copySegmentHTML('closing')">Copy HTML</button>
    </div>
    <div class="segment-content" id="content-closing" style="font-family: Helvetica, Arial, sans-serif;">
      <hr class="divider">
      ${content.segments.closing.body}
      <p><strong>${content.segments.closing.cta}</strong></p>
      <hr class="divider">
      <p style="font-size:12px; color:#999; text-align:center;">You're receiving this because you subscribed to Space Pulse.<br><a href="#" style="color:#999;">Unsubscribe</a> · <a href="#" style="color:#999;">Preferences</a></p>
    </div>
  </div>

  <div class="footer-note">
    Generated by Space Pulse Pipeline · Perplexity → Firecrawl → Claude → Nano Banana<br>
    Paste each segment into a Beehiiv text block. Replace {{IMAGE}} placeholders with generated images.
  </div>

  <script>
    // Copy rendered text (for pasting into regular Beehiiv text blocks)
    function copySegmentText(idx) {
      const content = document.getElementById('content-' + idx);
      const range = document.createRange();
      range.selectNodeContents(content);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('copy');
      selection.removeAllRanges();

      const buttons = content.parentElement.querySelectorAll('.copy-btn');
      const textBtn = buttons[0]; // First button is "Copy Text"
      textBtn.textContent = '✓ Copied';
      textBtn.classList.add('copied');
      setTimeout(() => {
        textBtn.textContent = 'Copy Text';
        textBtn.classList.remove('copied');
      }, 1500);
    }

    // Copy raw HTML (for pasting into Beehiiv Custom HTML blocks)
    function copySegmentHTML(idx) {
      const content = document.getElementById('content-' + idx);
      const htmlString = content.innerHTML;

      // Use modern clipboard API if available
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(htmlString).then(() => {
          const buttons = content.parentElement.querySelectorAll('.copy-btn');
          const htmlBtn = buttons[1]; // Second button is "Copy HTML"
          htmlBtn.textContent = '✓ Copied';
          htmlBtn.classList.add('copied');
          setTimeout(() => {
            htmlBtn.textContent = 'Copy HTML';
            htmlBtn.classList.remove('copied');
          }, 1500);
        }).catch(err => {
          console.error('Failed to copy HTML:', err);
          alert('Failed to copy HTML. Please try again.');
        });
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = htmlString;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);

        const buttons = content.parentElement.querySelectorAll('.copy-btn');
        const htmlBtn = buttons[1];
        htmlBtn.textContent = '✓ Copied';
        htmlBtn.classList.add('copied');
        setTimeout(() => {
          htmlBtn.textContent = 'Copy HTML';
          htmlBtn.classList.remove('copied');
        }, 1500);
      }
    }

    function copyAll() {
      const segments = [];
      let idx = 0;
      while (document.getElementById('content-' + idx)) {
        segments.push(document.getElementById('content-' + idx));
        idx++;
      }
      // Also add sponsor, quickhits, deepspace, closing
      ['sponsor', 'quickhits', 'deepspace', 'closing'].forEach(id => {
        const el = document.getElementById('content-' + id);
        if (el) segments.push(el);
      });

      const temp = document.createElement('div');
      segments.forEach((seg, i) => {
        const clone = seg.cloneNode(true);
        temp.appendChild(clone);
        if (i < segments.length - 1) {
          const br = document.createElement('br');
          temp.appendChild(br);
        }
      });

      document.body.appendChild(temp);
      const range = document.createRange();
      range.selectNodeContents(temp);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('copy');
      selection.removeAllRanges();
      document.body.removeChild(temp);

      const btn = document.querySelector('.copy-all-btn');
      btn.textContent = '✓ Copied All!';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = '📋 Copy Entire Newsletter';
        btn.classList.remove('copied');
      }, 2000);
    }
  </script>
</body>
</html>`;
  }

  private buildStorySegment(story: any, storyNum: number, imageResult: ImageResult, editionDate: string): string {
    const segmentNum = storyNum + 1; // +1 because intro is segment 1

    // Find matching image
    const imageData = imageResult.images.find(
      (img) => img.section_id === `section_${storyNum}`
    );
    const imagePath = imageData?.file_path || '';
    // Use API route for images (works both in dashboard and direct file view)
    const apiImagePath = imagePath ? `/api/editions/${editionDate}/images/section_${storyNum}.png` : '';
    const imageHTML = apiImagePath
      ? `<img src="${apiImagePath}" alt="${story.section_label}" style="width:100%; border-radius:8px; margin-bottom:16px;">`
      : `<div class="img-placeholder"><span>{{IMAGE_${storyNum}}} — Nano Banana: ${story.section_label.toLowerCase()}</span></div>`;

    return `  <!-- STORY ${storyNum} -->
  <div class="segment" id="seg-${segmentNum}">
    <span class="segment-label story-label">${story.section_emoji} ${story.section_label} — STORY ${storyNum}</span>

    <!-- TITLE SECTION (paste above image in Beehiiv) -->
    <div style="position: relative; margin-bottom: 16px; padding-top: 24px;">
      <div class="copy-buttons">
        <button class="copy-btn" onclick="copySegmentText('title-${segmentNum}')">Copy Title</button>
        <button class="copy-btn html" onclick="copySegmentHTML('title-${segmentNum}')">Copy Title HTML</button>
      </div>
      <div class="segment-content" id="content-title-${segmentNum}" style="font-family: Helvetica, Arial, sans-serif;">
        <span style="font-family: Helvetica, Arial, sans-serif; font-size: 11px; font-weight: 600; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.5px; display: block; margin-bottom: 8px;">${story.section_emoji} ${story.section_label}</span>
        <h2 style="font-family: Helvetica, Arial, sans-serif; font-size: 20px; font-weight: 700; margin: 0; letter-spacing: -0.3px; line-height: 1.3;">${story.headline}</h2>
      </div>
    </div>

    <!-- IMAGE (upload manually in Beehiiv) -->
    ${imageHTML}

    <!-- BODY SECTION (paste below image in Beehiiv) -->
    <div style="position: relative; margin-top: 16px; padding-top: 24px;">
      <div class="copy-buttons">
        <button class="copy-btn" onclick="copySegmentText('body-${segmentNum}')">Copy Body</button>
        <button class="copy-btn html" onclick="copySegmentHTML('body-${segmentNum}')">Copy Body HTML</button>
      </div>
      <div class="segment-content" id="content-body-${segmentNum}" style="font-family: Helvetica, Arial, sans-serif;">
        ${story.body_html}
        <div style="background: #f8f8f8; border-left: 3px solid #f59e0b; padding: 10px 14px; margin: 12px 0; font-size: 14px; line-height: 1.6; color: #333; font-family: Helvetica, Arial, sans-serif;">
          ${story.tldr_html}
        </div>
        <a href="${story.read_more_url}" style="display: inline-block; font-size: 13px; font-weight: 600; color: #f59e0b; text-decoration: none; margin-top: 4px; font-family: Helvetica, Arial, sans-serif;">${story.read_more_label}</a>
      </div>
    </div>
  </div>`;
  }

  private buildDeepSpaceSegment(deepSpace: any, imageResult: ImageResult, editionDate: string): string {
    // Find deep space image
    const imageData = imageResult.images.find((img) => img.section_id === 'deep_space');
    const imagePath = imageData?.file_path || '';
    // Use API route for images
    const apiImagePath = imagePath ? `/api/editions/${editionDate}/images/deep_space.png` : '';
    const imageHTML = apiImagePath
      ? `<img src="${apiImagePath}" alt="Deep Space" style="width:100%; border-radius:8px; margin-bottom:16px; height:160px; object-fit:cover;">`
      : `<div class="img-placeholder" style="height:160px;"><span>{{IMAGE_DEEPSPACE}} — Nano Banana: deep space</span></div>`;

    return `  <!-- DEEP SPACE -->
  <div class="segment" id="seg-deepspace">
    <span class="segment-label deepspace-label">🔭 DEEP SPACE</span>
    <div class="copy-buttons">
      <button class="copy-btn" onclick="copySegmentText('deepspace')">Copy Text</button>
      <button class="copy-btn html" onclick="copySegmentHTML('deepspace')">Copy HTML</button>
    </div>
    ${imageHTML}
    <div class="segment-content" id="content-deepspace" style="font-family: Helvetica, Arial, sans-serif;">
      <h2 style="font-family: Helvetica, Arial, sans-serif; font-size: 20px; font-weight: 700; margin: 0 0 14px 0; letter-spacing: -0.3px; line-height: 1.3;">🔭 Deep Space Corner</h2>
      ${deepSpace.body_html}
      <a href="${deepSpace.read_more_url}" style="display: inline-block; font-size: 13px; font-weight: 600; color: #f59e0b; text-decoration: none; margin-top: 4px; font-family: Helvetica, Arial, sans-serif;">Read more →</a>
    </div>
  </div>
`;
  }
}
