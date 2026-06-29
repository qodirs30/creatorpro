import React from 'react';

/**
 * Parses inline markdown patterns such as:
 * - **bold** or __bold__ -> <strong>
 * - *italic* or _italic_ -> <em>
 * - `code` -> <code>
 * - [label](url) -> <a>
 */
function parseInlineMarkdown(text) {
  if (!text) return '';

  const tokens = [];
  let index = 0;

  const boldRegex = /^\*\*([^*]+)\*\*|^__([^_]+)__/;
  const italicRegex = /^\*([^*]+)\*|^_([^_]+)_/;
  const codeRegex = /^`([^`]+)`/;
  const linkRegex = /^\[([^\]]+)\]\(([^)]+)\)/;

  let remaining = text;

  while (remaining.length > 0) {
    // Check inline code
    let match = remaining.match(codeRegex);
    if (match) {
      tokens.push(
        <code 
          key={`code-${index++}`} 
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            padding: '2px 6px',
            borderRadius: '4px',
            fontFamily: 'Consolas, Monaco, monospace',
            fontSize: '0.85em',
            color: '#ff79c6', // Nice pinkish/purple accent color for code
            border: '1px solid rgba(255, 255, 255, 0.05)',
          }}
        >
          {match[1]}
        </code>
      );
      remaining = remaining.substring(match[0].length);
      continue;
    }

    // Check bold
    match = remaining.match(boldRegex);
    if (match) {
      const content = match[1] || match[2];
      tokens.push(
        <strong key={`bold-${index++}`} style={{ fontWeight: '700', color: '#ffffff' }}>
          {parseInlineMarkdown(content)}
        </strong>
      );
      remaining = remaining.substring(match[0].length);
      continue;
    }

    // Check italic
    match = remaining.match(italicRegex);
    if (match) {
      const content = match[1] || match[2];
      tokens.push(
        <em key={`italic-${index++}`} style={{ fontStyle: 'italic', color: 'rgba(255, 255, 255, 0.9)' }}>
          {parseInlineMarkdown(content)}
        </em>
      );
      remaining = remaining.substring(match[0].length);
      continue;
    }

    // Check link
    match = remaining.match(linkRegex);
    if (match) {
      const label = match[1];
      const url = match[2];
      tokens.push(
        <a 
          key={`link-${index++}`} 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ 
            color: '#818cf8', // Indigo light
            textDecoration: 'underline',
            fontWeight: '500',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#a5b4fc'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#818cf8'}
        >
          {parseInlineMarkdown(label)}
        </a>
      );
      remaining = remaining.substring(match[0].length);
      continue;
    }

    // Just standard text up to the next special character (*, _, `, [)
    const nextSpecial = remaining.search(/[*_`[]/);
    if (nextSpecial === -1) {
      tokens.push(remaining);
      break;
    } else if (nextSpecial === 0) {
      // Treat as plain character and move forward
      tokens.push(remaining[0]);
      remaining = remaining.substring(1);
    } else {
      tokens.push(remaining.substring(0, nextSpecial));
      remaining = remaining.substring(nextSpecial);
    }
  }

  return tokens;
}

/**
 * Handles block parsing and rendering of Markdown text
 */
export default function MarkdownRenderer({ text }) {
  if (!text) return null;

  const blocks = [];
  const lines = text.split('\n');
  let inCodeBlock = false;
  let codeLang = '';
  let codeContent = [];

  let currentList = null;

  const flushList = () => {
    if (currentList) {
      blocks.push({
        type: currentList.type,
        items: currentList.items
      });
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code block detection
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        blocks.push({
          type: 'code',
          lang: codeLang,
          content: codeContent.join('\n')
        });
        codeContent = [];
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
        codeLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    // Unordered List Match
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (ulMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(ulMatch[2]);
      continue;
    }

    // Ordered List Match
    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (olMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(olMatch[2]);
      continue;
    }

    // Flush active lists if line is not a list item
    flushList();

    // Headers Match
    const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      blocks.push({
        type: 'header',
        level: headerMatch[1].length,
        text: headerMatch[2]
      });
      continue;
    }

    // Blockquote Match
    const quoteMatch = line.match(/^>\s+(.*)$/);
    if (quoteMatch) {
      blocks.push({
        type: 'blockquote',
        text: quoteMatch[1]
      });
      continue;
    }

    // Paragraph empty separator
    if (line.trim() === '') {
      blocks.push({
        type: 'space'
      });
      continue;
    }

    // Paragraph text line
    if (blocks.length > 0 && blocks[blocks.length - 1].type === 'paragraph') {
      blocks[blocks.length - 1].text += '\n' + line;
    } else {
      blocks.push({
        type: 'paragraph',
        text: line
      });
    }
  }

  flushList();

  // Header styles
  const headerStyles = {
    1: { fontSize: '1.35rem', margin: '0.85rem 0 0.45rem 0', fontWeight: '700', color: '#ffffff' },
    2: { fontSize: '1.2rem', margin: '0.75rem 0 0.4rem 0', fontWeight: '700', color: '#ffffff' },
    3: { fontSize: '1.05rem', margin: '0.65rem 0 0.35rem 0', fontWeight: '600', color: '#ffffff' },
    4: { fontSize: '0.95rem', margin: '0.55rem 0 0.3rem 0', fontWeight: '600', color: '#ffffff' },
    5: { fontSize: '0.9rem', margin: '0.45rem 0 0.25rem 0', fontWeight: '600', color: '#ffffff' },
    6: { fontSize: '0.85rem', margin: '0.45rem 0 0.25rem 0', fontWeight: '600', color: '#ffffff' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      {blocks.map((block, idx) => {
        const key = `block-${idx}`;

        switch (block.type) {
          case 'header': {
            const HeaderTag = `h${block.level}`;
            return React.createElement(
              HeaderTag,
              { key, style: headerStyles[block.level] || headerStyles[3] },
              parseInlineMarkdown(block.text)
            );
          }

          case 'blockquote':
            return (
              <blockquote 
                key={key} 
                style={{
                  borderLeft: '3px solid var(--primary, #6366f1)',
                  paddingLeft: '0.75rem',
                  margin: '0.4rem 0',
                  color: '#94a3b8',
                  fontStyle: 'italic',
                }}
              >
                {parseInlineMarkdown(block.text)}
              </blockquote>
            );

          case 'code':
            return (
              <div key={key} style={{ position: 'relative', margin: '0.5rem 0', width: '100%' }}>
                {block.lang && (
                  <div style={{
                    fontSize: '0.65rem',
                    color: '#94a3b8',
                    background: 'rgba(255, 255, 255, 0.03)',
                    padding: '2px 8px',
                    borderTopLeftRadius: '6px',
                    borderTopRightRadius: '6px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'inline-block',
                    fontFamily: 'monospace',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    {block.lang}
                  </div>
                )}
                <pre style={{
                  margin: 0,
                  padding: '0.75rem',
                  background: '#07080d',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: block.lang ? '0 6px 6px 6px' : '6px',
                  overflowX: 'auto',
                  fontFamily: 'Consolas, Monaco, "Andale Mono", monospace',
                  fontSize: '0.8rem',
                  lineHeight: '1.4',
                  color: '#e2e8f0',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}>
                  <code>{block.content}</code>
                </pre>
              </div>
            );

          case 'ul':
            return (
              <ul key={key} style={{ paddingLeft: '1.25rem', margin: '0.35rem 0', listStyleType: 'disc' }}>
                {block.items.map((item, itemIdx) => (
                  <li key={`ul-item-${itemIdx}`} style={{ margin: '0.2rem 0', color: 'rgba(255, 255, 255, 0.95)' }}>
                    {parseInlineMarkdown(item)}
                  </li>
                ))}
              </ul>
            );

          case 'ol':
            return (
              <ol key={key} style={{ paddingLeft: '1.25rem', margin: '0.35rem 0', listStyleType: 'decimal' }}>
                {block.items.map((item, itemIdx) => (
                  <li key={`ol-item-${itemIdx}`} style={{ margin: '0.2rem 0', color: 'rgba(255, 255, 255, 0.95)' }}>
                    {parseInlineMarkdown(item)}
                  </li>
                ))}
              </ol>
            );

          case 'paragraph': {
            const paragraphLines = block.text.split('\n');
            return (
              <p key={key} style={{ margin: '0.25rem 0', lineHeight: '1.5', color: 'rgba(255, 255, 255, 0.95)' }}>
                {paragraphLines.map((line, lineIdx) => (
                  <React.Fragment key={`line-${lineIdx}`}>
                    {parseInlineMarkdown(line)}
                    {lineIdx < paragraphLines.length - 1 && <br />}
                  </React.Fragment>
                ))}
              </p>
            );
          }

          case 'space':
            return <div key={key} style={{ height: '0.35rem' }} />;

          default:
            return null;
        }
      })}
    </div>
  );
}
