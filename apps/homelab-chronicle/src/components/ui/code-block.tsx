'use client'

import { useState } from 'react'
import { Check, Copy, FileCode } from 'lucide-react'

interface CodeBlockProps {
  code: string
  language?: string
  filename?: string
  showLineNumbers?: boolean
}

// Simple syntax highlighting (can be enhanced with Prism or Shiki)
function highlightCode(code: string, language: string): string {
  // Basic keyword highlighting for common languages
  const keywords: Record<string, string[]> = {
    javascript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch'],
    typescript: ['const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while', 'class', 'import', 'export', 'from', 'async', 'await', 'try', 'catch', 'interface', 'type', 'enum'],
    python: ['def', 'class', 'return', 'if', 'else', 'elif', 'for', 'while', 'import', 'from', 'try', 'except', 'with', 'as', 'yield', 'lambda'],
    yaml: [],
    bash: ['if', 'then', 'else', 'fi', 'for', 'do', 'done', 'while', 'case', 'esac', 'function'],
    docker: ['FROM', 'RUN', 'CMD', 'ENTRYPOINT', 'COPY', 'ADD', 'ENV', 'EXPOSE', 'WORKDIR', 'USER', 'ARG', 'VOLUME'],
  }

  let highlighted = code
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Highlight strings
  highlighted = highlighted.replace(
    /(["'`])(?:(?!\1)[^\\]|\\.)*\1/g,
    '<span class="text-green-400">$&</span>'
  )

  // Highlight comments
  highlighted = highlighted.replace(
    /(#.*$|\/\/.*$|\/\*[\s\S]*?\*\/)/gm,
    '<span class="text-gray-500 italic">$&</span>'
  )

  // Highlight numbers
  highlighted = highlighted.replace(
    /\b(\d+\.?\d*)\b/g,
    '<span class="text-orange-400">$1</span>'
  )

  // Highlight keywords
  const langKeywords = keywords[language] || []
  langKeywords.forEach(keyword => {
    const regex = new RegExp(`\\b(${keyword})\\b`, 'g')
    highlighted = highlighted.replace(regex, '<span class="text-purple-400 font-medium">$1</span>')
  })

  return highlighted
}

export function CodeBlock({
  code,
  language = 'plaintext',
  filename,
  showLineNumbers = true,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const lines = code.split('\n')
  const highlightedCode = highlightCode(code, language)

  return (
    <div className="rounded-lg overflow-hidden border bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <FileCode className="h-4 w-4 text-zinc-400" />
          {filename ? (
            <span className="text-sm font-mono text-zinc-300">{filename}</span>
          ) : (
            <span className="text-sm text-zinc-400">{language}</span>
          )}
        </div>
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </button>
      </div>

      {/* Code */}
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm font-mono leading-relaxed">
          {showLineNumbers ? (
            <table className="w-full">
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} className="hover:bg-zinc-900/50">
                    <td className="pr-4 text-right text-zinc-600 select-none w-8">
                      {i + 1}
                    </td>
                    <td
                      className="whitespace-pre"
                      dangerouslySetInnerHTML={{
                        __html: highlightCode(line, language) || '&nbsp;',
                      }}
                    />
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
          )}
        </pre>
      </div>
    </div>
  )
}
