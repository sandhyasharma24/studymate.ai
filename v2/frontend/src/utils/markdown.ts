/**
 * A lightweight, XSS-safe markdown renderer for StudyMate AI.
 * Handles bold, italics, inline code, bullet points, numbered lists, and headings.
 */
export const renderMarkdown = (text: string): string => {
  if (!text) return '';
  
  // Escape HTML to prevent XSS
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold: **text**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  // Italics: *text* or _text_
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');

  // Inline code: `code`
  html = html.replace(/`(.*?)`/g, '<code class="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-850 text-xs font-mono text-accent">$1</code>');

  // Split lines to detect lists and headings
  const lines = html.split(/\n/);
  const formattedLines = lines.map(line => {
    const trimmed = line.trim();
    if (!trimmed) return '<div class="h-2"></div>'; // Paragraph separator spacer

    // Bullet points: • or - or *
    if (trimmed.startsWith('•') || trimmed.startsWith('-') || (trimmed.startsWith('*') && !trimmed.endsWith('*'))) {
      const content = trimmed.replace(/^[•\-*]\s*/, '');
      return `<li class="ml-4 list-disc text-slate-300 my-1">${content}</li>`;
    }

    // Numbered lists: 1. or 2.
    if (/^\d+[\.)]\s+/.test(trimmed)) {
      const content = trimmed.replace(/^\d+[\.)]\s+/, '');
      const numMatch = trimmed.match(/^(\d+)/);
      const num = numMatch ? numMatch[1] : '1';
      return `<li class="ml-4 list-decimal text-slate-300 my-1" value="${num}">${content}</li>`;
    }

    // Bold Headings: E.g., **Heading:** or **Heading?** or lines that start and end with bold tags
    if (trimmed.startsWith('<strong>') && (trimmed.endsWith('</strong>') || trimmed.endsWith('</strong>:') || trimmed.endsWith('</strong>?') || trimmed.endsWith('</strong>.'))) {
      return `<h4 class="text-slate-100 font-bold font-display mt-4 mb-2 text-sm md:text-base">${trimmed}</h4>`;
    }

    return `<p class="text-slate-300 leading-relaxed my-1">${trimmed}</p>`;
  });

  return formattedLines.join('');
};
