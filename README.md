# 🛰️ Space Pulse

**Automated space industry newsletter generation pipeline**

Space Pulse is a 5-stage AI-powered system that discovers, curates, writes, and illustrates a weekly space industry newsletter in the style of TLDR and The AI Rundown.

## Features

- **🔍 Discovery**: Finds 15-20 trending space news stories using Perplexity Sonar
- **📰 Crawling**: Extracts full article content using Firecrawl
- **✂️ Curation**: Deduplicates and ranks stories using OpenAI GPT-4
- **✍️ Writing**: Generates TLDR-style newsletter copy using Claude Opus
- **🎨 Images**: Creates cinematic header images using Nano Banana (Gemini)
- **📊 Dashboard**: React UI for source management and pipeline control
- **📋 Output**: Segmented HTML ready for Beehiiv copy-paste

## Quick Start

### 1. Install Dependencies

```bash
npm install
cd dashboard && npm install && cd ..
```

### 2. Configure API Keys

Copy `.env.example` to `.env` and add your API keys:

```bash
cp .env.example .env
```

Required API keys:
- Perplexity API key (get at perplexity.ai)
- Firecrawl API key (get at firecrawl.dev)
- OpenAI API key (get at platform.openai.com)
- Anthropic API key (get at console.anthropic.com)
- Gemini API key (get at aistudio.google.com)

### 3. Configure MCP Servers

The pipeline uses 5 MCP servers. Configure them in `~/.claude/config.json`:

```json
{
  "mcpServers": {
    "perplexity": {
      "command": "npx",
      "args": ["-y", "@perplexity-ai/mcp-server"],
      "env": {
        "PERPLEXITY_API_KEY": "${PERPLEXITY_API_KEY}"
      }
    },
    "firecrawl": {
      "command": "npx",
      "args": ["-y", "@mendable/firecrawl-mcp"],
      "env": {
        "FIRECRAWL_API_KEY": "${FIRECRAWL_API_KEY}"
      }
    },
    "openai": {
      "command": "npx",
      "args": ["-y", "mcp-openai"],
      "env": {
        "OPENAI_API_KEY": "${OPENAI_API_KEY}"
      }
    },
    "nano-banana": {
      "command": "npx",
      "args": ["-y", "nano-banana-mcp"],
      "env": {
        "GEMINI_API_KEY": "${GEMINI_API_KEY}"
      }
    }
  }
}
```

### 4. Start the System

Start the backend API server:

```bash
npm run server
```

In a separate terminal, start the dashboard:

```bash
cd dashboard
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) to access the dashboard.

## Usage

### Via Dashboard (Recommended)

1. Open the dashboard at http://localhost:5173
2. Navigate to "Sources" tab to manage news sources
3. Navigate to "Pipeline" tab and click "Generate Newsletter"
4. Watch real-time progress as each stage completes
5. Preview the generated newsletter
6. Copy segments to Beehiiv

### Via CLI

Run the full pipeline:

```bash
npm run pipeline
```

Run a single stage:

```bash
npm run pipeline:stage discovery
```

Regenerate from a specific stage:

```bash
npm run pipeline:from editorial -- --edition 2026-02-17
```

## Pipeline Stages

### Stage 1: Discovery (Perplexity Sonar)
- Searches for space news from the past 7 days
- Returns 15-20 candidate stories with metadata
- Output: `data/editions/YYYY-MM-DD/discovery.json`

### Stage 2: Deep Crawl (Firecrawl)
- Extracts full article content from top 10 URLs
- Handles paywalls and timeouts gracefully
- Output: `data/editions/YYYY-MM-DD/articles.json`

### Stage 3: Editorial (OpenAI GPT-4)
- Deduplicates stories covering the same event
- Ranks by newsworthiness, interest, and impact
- Selects 6-8 main stories + 3-4 quick hits
- Output: `data/editions/YYYY-MM-DD/editorial.json`

### Stage 4: Writing (Claude Opus)
- Writes complete newsletter in TLDR style
- Conversational, opinionated, engaging
- Subject line, intro, stories, quick hits, closing
- Output: `data/editions/YYYY-MM-DD/newsletter_content.json`

### Stage 5: Images (Nano Banana)
- Generates 5-6 cinematic header images
- Photorealistic, editorial style, deep space colors
- 16:9 aspect ratio for email headers
- Output: `data/editions/YYYY-MM-DD/images/`

### Assembly
- Combines content and images into segmented HTML
- Copy-paste ready for Beehiiv editor
- Output: `data/editions/YYYY-MM-DD/output.html`

## Project Structure

```
space-pulse/
├── src/
│   ├── pipeline/          # Pipeline orchestration
│   ├── services/          # MCP server wrappers
│   ├── storage/           # Data persistence
│   ├── api/               # Express API server
│   ├── output/            # Template engine
│   └── utils/             # Utilities
├── dashboard/             # React UI
├── data/
│   ├── sources.json       # News sources config
│   └── editions/          # Generated newsletters
├── templates/             # HTML templates
└── prompts/               # AI prompts
```

## Configuration

### Managing Sources

Edit `data/sources.json` or use the dashboard to:
- Add/remove news sources
- Enable/disable sources
- Organize by category
- Track source performance

Default sources include: SpaceNews, NASA Blog, SpaceX, Ars Technica Space, ESA, Space.com, Reuters Space, and more.

### Customizing Prompts

Edit prompt files in `prompts/` to adjust:
- Discovery search terms and filters
- Editorial ranking criteria
- Writing style and voice
- Image generation style

## Development

### Running Tests

```bash
npm test
```

### Building for Production

```bash
npm run build
```

### Deployment

See deployment guide in the plan document for VPS setup, Docker configuration, and production best practices.

## Cost Estimate

**Monthly Operating Cost (Weekly Newsletter):**
- Perplexity: ~$4/month
- Firecrawl: ~$5/month
- OpenAI: ~$8/month
- Anthropic: ~$10/month
- Gemini: ~$4/month
- **Total: ~$31/month**

**Revenue Potential:**
- 50K subscribers: $2-2.5K per newsletter
- 100K subscribers: $5-6K per newsletter

## Troubleshooting

### MCP Server Connection Issues

Verify MCP servers are configured:
```bash
# Test Perplexity
npx @perplexity-ai/mcp-server

# Test Firecrawl
npx @mendable/firecrawl-mcp
```

### API Rate Limits

The pipeline includes automatic retry logic with exponential backoff. If you hit rate limits frequently, consider:
- Adding delays between requests
- Reducing the number of stories processed
- Upgrading to higher-tier API plans

### Missing Data

If a stage fails, check:
1. API keys are correct in `.env`
2. MCP servers are properly configured
3. Log files in the console output
4. Previous stage output files exist

## Support

For issues, questions, or feature requests, open an issue on GitHub or contact the maintainer.

## License

MIT License - see LICENSE file for details

---

Built with ❤️ for the space industry
