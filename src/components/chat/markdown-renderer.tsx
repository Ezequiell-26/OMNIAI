'use client';

/**
 * MarkdownRenderer — renderizado completo de Markdown para las respuestas:
 * GFM (tablas, checklists), resaltado de código vía CodeBlock y estilos
 * tipográficos acordes a la estética Vercel/Linear (todo en overrides,
 * sin depender de @tailwindcss/typography).
 */

import type { ReactNode } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CodeBlock } from '@/components/chat/code-block';

/** Extrae el texto plano de los children de un nodo Markdown. */
function extractText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (node && typeof node === 'object' && 'props' in node) {
    const props = (node as { props?: { children?: ReactNode } }).props;
    return extractText(props?.children);
  }
  return '';
}

const components: Components = {
  // Los bloques cercados los maneja `code`; `pre` solo delega.
  pre: ({ children }) => <>{children}</>,
  code: ({ className, children }) => {
    const match = /language-([\w+-]+)/.exec(className ?? '');
    const raw = extractText(children);
    const isBlock = Boolean(match) || raw.includes('\n');
    if (!isBlock) {
      return (
        <code className="rounded-md border border-border/40 bg-muted px-[0.35em] py-[0.15em] font-mono text-[0.85em]">
          {children}
        </code>
      );
    }
    return <CodeBlock code={raw.replace(/\n$/, '')} language={match?.[1]} />;
  },
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
    >
      {children}
    </a>
  ),
  p: ({ children }) => <p className="my-3 leading-7 first:mt-0 last:mb-0">{children}</p>,
  h1: ({ children }) => <h1 className="mb-3 mt-5 text-xl font-semibold tracking-tight first:mt-0">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-3 mt-5 text-lg font-semibold tracking-tight first:mt-0">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-2 mt-4 text-base font-semibold first:mt-0">{children}</h3>,
  h4: ({ children }) => <h4 className="mb-2 mt-3 text-sm font-semibold first:mt-0">{children}</h4>,
  ul: ({ children }) => (
    <ul className="my-3 list-disc space-y-1 pl-6 marker:text-muted-foreground/60">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 list-decimal space-y-1 pl-6 marker:text-muted-foreground/60">{children}</ol>
  ),
  li: ({ children }) => <li className="leading-7">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-border pl-4 italic text-muted-foreground">{children}</blockquote>
  ),
  hr: () => <hr className="my-5 border-border/60" />,
  table: ({ children }) => (
    <div className="my-4 w-full overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border-b border-border/60 bg-muted/50 px-3 py-2 text-left font-medium">{children}</th>
  ),
  td: ({ children }) => <td className="border-b border-border/40 px-3 py-2 align-top">{children}</td>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
};

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="min-w-0 break-words text-sm text-foreground/90">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
