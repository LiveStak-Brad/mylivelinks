import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';
import { load as loadHtml } from 'cheerio';
import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..', '..');
const CONFIG_PATH = path.join(__dirname, 'allowlist.json');
const OUTPUT_DIR = path.join(__dirname, 'output');
const JSON_OUTPUT = path.join(OUTPUT_DIR, 'knowledge_pack.json');
const MD_OUTPUT = path.join(OUTPUT_DIR, 'knowledge_pack.md');

/**
 * Basic whitespace cleanup for extracted text.
 */
function cleanText(value = '') {
  return value.replace(/\s+/g, ' ').trim();
}

function slugifyHeading(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 80);
}

function dedupe(values = []) {
  return [...new Set(values.map((val) => cleanText(val)).filter(Boolean))];
}

function buildSummary(paragraphs, maxSentences = 3) {
  const sentences = [];
  for (const paragraph of paragraphs) {
    const split = paragraph
      .replace(/([.!?])\s+/g, '$1|')
      .split('|')
      .map((s) => cleanText(s))
      .filter(Boolean);
    for (const sentence of split) {
      if (sentences.length < maxSentences) {
        sentences.push(sentence);
      }
    }
    if (sentences.length >= maxSentences) {
      break;
    }
  }
  return sentences.join(' ');
}

function deriveKeyFacts(listItems = [], paragraphs = []) {
  const facts = dedupe([
    ...listItems,
    ...paragraphs.filter((paragraph) => paragraph.length <= 220).slice(0, 5),
  ]);
  return facts.slice(0, 10);
}

function markdownNodeToText(node) {
  if (!node) return '';
  if (node.type === 'text' || node.type === 'inlineCode') {
    return node.value;
  }
  if (node.children && node.children.length > 0) {
    return node.children.map((child) => markdownNodeToText(child)).join(' ');
  }
  return '';
}

function ensureOutputDir() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    throw new Error(`Allowlist config missing at ${CONFIG_PATH}`);
  }
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  return JSON.parse(raw);
}

async function fetchRemoteSources(config) {
  const blockedPatterns = config.blockedPathPatterns || [];
  const sources = [];

  for (const entry of config.remote || []) {
    const url = entry.url;
    const blocked = blockedPatterns.some((pattern) =>
      url.toLowerCase().includes(pattern.toLowerCase()),
    );
    if (blocked) {
      console.warn(`Skipping blocked URL: ${url}`);
      continue;
    }
    try {
      const response = await fetch(url);
      if (!response.ok) {
        console.warn(`Failed to fetch ${url}: ${response.status}`);
        continue;
      }
      const html = await response.text();
      sources.push(parseRemoteDocument({ html, url, entry }));
    } catch (error) {
      console.warn(`Fetch error for ${url}: ${error.message}`);
    }
  }

  return sources;
}

function parseRemoteDocument({ html, url, entry }) {
  const $ = loadHtml(html);
  $('script, style, noscript').remove();
  for (const selector of entry.stripSelectors || []) {
    $(selector).remove();
  }

  const headings = [];
  $('h1, h2, h3').each((_idx, el) => {
    const text = cleanText($(el).text());
    if (!text) return;
    const level = Number(el.tagName.replace('h', '')) || 2;
    headings.push({ level, text, slug: slugifyHeading(text) });
  });

  const paragraphTexts = [];
  $('main p, article p, section p, p').each((_idx, el) => {
    const text = cleanText($(el).text());
    if (text && !paragraphTexts.includes(text)) {
      paragraphTexts.push(text);
    }
  });

  if (!paragraphTexts.length) {
    const metaDescription =
      cleanText($('meta[name="description"]').attr('content') || '') ||
      cleanText($('meta[property="og:description"]').attr('content') || '');
    if (metaDescription) {
      paragraphTexts.push(metaDescription);
    }
  }

  const listItems = [];
  $('main li, article li, section li, li').each((_idx, el) => {
    const text = cleanText($(el).text());
    if (text && !listItems.includes(text)) {
      listItems.push(text);
    }
  });

  return {
    kind: 'remote',
    title: entry.title || headings[0]?.text || url,
    source: url,
    headings,
    summary: buildSummary(paragraphTexts),
    key_facts: deriveKeyFacts(listItems, paragraphTexts),
  };
}

async function fetchLocalSources(config) {
  const entries = [];
  const seen = new Set();

  for (const item of config.local || []) {
    if (item.path) {
      const absolutePath = path.join(ROOT_DIR, item.path);
      if (!fs.existsSync(absolutePath)) {
        console.warn(`Local file not found: ${item.path}`);
        continue;
      }
      if (!seen.has(absolutePath)) {
        entries.push({ absolutePath, title: item.title || item.path });
        seen.add(absolutePath);
      }
      continue;
    }

    if (item.glob) {
      const globbed = await fg(item.glob, {
        cwd: ROOT_DIR,
        ignore: item.ignore || [],
        onlyFiles: true,
      });
      for (const relativePath of globbed) {
        const absolutePath = path.join(ROOT_DIR, relativePath);
        if (seen.has(absolutePath)) continue;
        entries.push({ absolutePath, title: item.title || relativePath });
        seen.add(absolutePath);
      }
    }
  }

  const normalized = [];
  for (const entry of entries) {
    const content = fs.readFileSync(entry.absolutePath, 'utf8');
    normalized.push(parseLocalDocument({ content, entry }));
  }
  return normalized;
}

function parseLocalDocument({ content, entry }) {
  const { content: body } = matter(content);
  const ast = unified().use(remarkParse).parse(body);
  const headings = [];
  const paragraphs = [];
  const listItems = [];

  visit(ast, 'heading', (node) => {
    const text = cleanText(markdownNodeToText(node));
    if (text) {
      headings.push({
        level: node.depth,
        text,
        slug: slugifyHeading(text),
      });
    }
  });

  visit(ast, 'paragraph', (node) => {
    const text = cleanText(markdownNodeToText(node));
    if (text) {
      paragraphs.push(text);
    }
  });

  visit(ast, 'listItem', (node) => {
    const text = cleanText(markdownNodeToText(node));
    if (text) {
      listItems.push(text);
    }
  });

  return {
    kind: 'local',
    title: entry.title,
    source: path.relative(ROOT_DIR, entry.absolutePath),
    headings,
    summary: buildSummary(paragraphs),
    key_facts: deriveKeyFacts(listItems, paragraphs),
  };
}

function buildMarkdown(pack) {
  const lines = [
    '# MyLiveLinks Site Facts',
    '',
    `_Generated at ${pack.generated_at}_`,
    '',
  ];

  for (const source of pack.sources) {
    lines.push(`## ${source.title}`);
    lines.push('');
    lines.push(`- Source: ${source.source}`);
    lines.push(`- Type: ${source.kind}`);
    if (source.headings.length) {
      lines.push('- Headings:');
      for (const heading of source.headings) {
        lines.push(`  - (${heading.level}) ${heading.text}`);
      }
    }
    lines.push('');
    lines.push('### Summary');
    lines.push(source.summary || '_No summary extracted_');
    lines.push('');
    lines.push('### Key Facts');
    if (source.key_facts.length) {
      for (const fact of source.key_facts) {
        lines.push(`- ${fact}`);
      }
    } else {
      lines.push('- _No key facts extracted_');
    }
    lines.push('');
  }

  return lines.join('\n');
}

async function main() {
  ensureOutputDir();
  const config = loadConfig();
  const [remoteSources, localSources] = await Promise.all([
    fetchRemoteSources(config),
    fetchLocalSources(config),
  ]);

  const sources = [...remoteSources, ...localSources].filter(
    (source) => source.summary || source.key_facts.length,
  );

  const pack = {
    generated_at: new Date().toISOString(),
    source_count: sources.length,
    sources,
  };

  fs.writeFileSync(JSON_OUTPUT, JSON.stringify(pack, null, 2), 'utf8');
  fs.writeFileSync(MD_OUTPUT, buildMarkdown(pack), 'utf8');
  console.log(`Knowledge pack written to ${JSON_OUTPUT} and ${MD_OUTPUT}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
