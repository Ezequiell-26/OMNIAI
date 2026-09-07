'use client';

/**
 * CodeBlock — bloque de código con resaltado de sintaxis (Prism) y botón
 * de copiar con un clic. Usado por MarkdownRenderer para los bloques
 * cercados (```lang) del Markdown del asistente.
 */

import { useCallback, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Highlight, themes } from 'prism-react-renderer';
import { cn } from '@/lib/utils';

/** Lenguajes incluidos en el bundle de prism-react-renderer. */
const SUPPORTED_LANGUAGES = new Set([
  'markup', 'bash', 'clike', 'c', 'cpp', 'css', 'javascript', 'jsx', 'coffeescript',
  'actionscript', 'diff', 'git', 'go', 'graphql', 'handlebars', 'json', 'less',
  'makefile', 'markdown', 'objectivec', 'ocaml', 'python', 'reason', 'sass', 'scss',
  'sql', 'stylus', 'tsx', 'typescript', 'wasm', 'yaml',
]);

const LANG_ALIASES: Record<string, string> = {
  shell: 'bash',
  zsh: 'bash',
  sh: 'bash',
  console: 'bash',
  py: 'python',
  rb: 'ruby',
  ts: 'typescript',
  js: 'javascript',
  yml: 'yaml',
  html: 'markup',
  xml: 'markup',
  svg: 'markup',
  text: 'markup',
  plaintext: 'markup',
  txt: 'markup',
};

function normalizeLanguage(language?: string): string {
  const raw = (language ?? '').toLowerCase();
  const mapped = LANG_ALIASES[raw] ?? raw;
  return SUPPORTED_LANGUAGES.has(mapped) ? mapped : 'markup';
}

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lang = normalizeLanguage(language);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // El portapapeles puede estar bloqueado; se ignora silenciosamente.
    }
  }, [code]);

  return (
    <div className="my-4 overflow-hidden rounded-xl border border-border/60 bg-[#0b0e14] shadow-sm">
      {/* Barra superior: lenguaje + copiar */}
      <div className="flex items-center justify-between border-b border-white/5 bg-white/[0.02] px-3 py-1.5">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {language || 'código'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          aria-label="Copiar código al portapapeles"
          className={cn(
            'inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
            copied
              ? 'text-emerald-400'
              : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
          )}
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
        </button>
      </div>

      {/* Código resaltado */}
      <Highlight code={code.trim() || ' '} language={lang} theme={themes.oneDark}>
        {({ tokens, getLineProps, getTokenProps }) => (
          <pre className="max-h-[480px] overflow-auto p-4 text-[13px] leading-relaxed" style={{ background: 'transparent', margin: 0 }}>
            <code className="font-mono">
              {tokens.map((line, lineIndex) => (
                <div key={lineIndex} {...getLineProps({ line })}>
                  {line.map((token, tokenIndex) => (
                    <span key={tokenIndex} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </code>
          </pre>
        )}
      </Highlight>
    </div>
  );
}
