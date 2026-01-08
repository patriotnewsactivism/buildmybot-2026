import { db } from '../db';
import { knowledgeSources, knowledgeChunks } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';

export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  description?: string;
  links: string[];
  scrapedAt: Date;
}

export class WebScraperService {
  private static readonly MAX_CONTENT_LENGTH = 50000;
  private static readonly RATE_LIMIT_MS = 1000;
  private static lastRequestTime = 0;

  static async scrapeUrl(url: string): Promise<ScrapedContent> {
    await this.rateLimit();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'BuildMyBot/1.0 Knowledge Scraper',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const title = this.extractTitle(html);
      const description = this.extractMetaDescription(html);
      const content = this.extractText(html);
      const links = this.extractLinks(html, url);

      return {
        url,
        title,
        content: content.substring(0, this.MAX_CONTENT_LENGTH),
        description,
        links,
        scrapedAt: new Date(),
      };
    } catch (error: any) {
      throw new Error(`Failed to scrape ${url}: ${error.message}`);
    }
  }

  static async crawlWebsite(
    startUrl: string,
    maxPages: number = 5,
    sourceId: string,
    botId: string
  ): Promise<ScrapedContent[]> {
    const visited = new Set<string>();
    const toVisit = [startUrl];
    const results: ScrapedContent[] = [];
    const baseUrl = new URL(startUrl);

    while (toVisit.length > 0 && results.length < maxPages) {
      const currentUrl = toVisit.shift()!;
      
      if (visited.has(currentUrl)) continue;
      visited.add(currentUrl);

      try {
        const scraped = await this.scrapeUrl(currentUrl);
        results.push(scraped);

        const chunks = this.chunkContent(scraped.content);
        for (let i = 0; i < chunks.length; i++) {
          await db.insert(knowledgeChunks).values({
            id: uuidv4(),
            sourceId,
            botId,
            content: chunks[i],
            contentHash: this.hashContent(chunks[i]),
            metadata: { 
              title: scraped.title, 
              url: scraped.url,
              pageIndex: results.length,
            },
            chunkIndex: i,
            tokenCount: Math.ceil(chunks[i].length / 4),
          });
        }

        for (const link of scraped.links) {
          try {
            const linkUrl = new URL(link, currentUrl);
            if (linkUrl.hostname === baseUrl.hostname && !visited.has(linkUrl.href)) {
              toVisit.push(linkUrl.href);
            }
          } catch {}
        }

        await db.update(knowledgeSources)
          .set({ 
            pagesCrawled: results.length,
            updatedAt: new Date(),
          })
          .where(eq(knowledgeSources.id, sourceId));

      } catch (error: any) {
        console.error(`Error scraping ${currentUrl}:`, error.message);
      }
    }

    await db.update(knowledgeSources)
      .set({ 
        status: 'completed',
        pagesCrawled: results.length,
        lastCrawledAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(knowledgeSources.id, sourceId));

    return results;
  }

  static extractTitle(html: string): string {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return titleMatch ? titleMatch[1].trim() : 'Untitled';
  }

  static extractMetaDescription(html: string): string | undefined {
    const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
    return metaMatch ? metaMatch[1].trim() : undefined;
  }

  static extractText(html: string): string {
    let text = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
      .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
      .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
      .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
      .replace(/<aside\b[^<]*(?:(?!<\/aside>)<[^<]*)*<\/aside>/gi, ' ')
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#\d+;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    return text;
  }

  static extractLinks(html: string, baseUrl: string): string[] {
    const links: string[] = [];
    const linkPattern = /<a[^>]+href=["']([^"'#]+)["']/gi;
    let match;
    
    while ((match = linkPattern.exec(html)) !== null) {
      const href = match[1];
      if (!href.startsWith('javascript:') && !href.startsWith('mailto:')) {
        links.push(href);
      }
    }
    
    return [...new Set(links)].slice(0, 100);
  }

  static chunkContent(text: string, maxTokens: number = 500): string[] {
    const chunks: string[] = [];
    const sentences = text.split(/(?<=[.!?])\s+/);
    let currentChunk = '';
    let currentTokens = 0;

    for (const sentence of sentences) {
      const sentenceTokens = Math.ceil(sentence.length / 4);
      
      if (currentTokens + sentenceTokens > maxTokens && currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
        currentTokens = sentenceTokens;
      } else {
        currentChunk += ' ' + sentence;
        currentTokens += sentenceTokens;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  static hashContent(content: string): string {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  private static async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    
    if (timeSinceLastRequest < this.RATE_LIMIT_MS) {
      await new Promise(resolve => 
        setTimeout(resolve, this.RATE_LIMIT_MS - timeSinceLastRequest)
      );
    }
    
    this.lastRequestTime = Date.now();
  }
}
