import type { ReactNode } from 'react'

// Small, safe Markdown subset renderer (no HTML injection): headings, bullet and
// numbered lists, fenced code, **bold**, *italic* / _italic_, `code`, and paragraphs.

function inline(text: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g
  let last = 0
  let m: RegExpExecArray | null
  let key = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index))
    const tok = m[0]
    if (tok.startsWith('**')) out.push(<strong key={key++}>{tok.slice(2, -2)}</strong>)
    else if (tok.startsWith('`')) out.push(<code key={key++} className="rounded bg-slate-100 px-1 py-0.5 text-[0.85em]">{tok.slice(1, -1)}</code>)
    else out.push(<em key={key++}>{tok.slice(1, -1)}</em>)
    last = m.index + tok.length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}

export function Markdown({ source }: { source: string }) {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const blocks: ReactNode[] = []
  let i = 0
  let key = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim().startsWith('```')) {
      const code: string[] = []
      i++
      while (i < lines.length && !lines[i].trim().startsWith('```')) code.push(lines[i++])
      i++
      blocks.push(
        <pre key={key++} className="my-3 overflow-x-auto rounded-lg bg-slate-900 p-4 text-sm leading-relaxed text-slate-100">
          <code>{code.join('\n')}</code>
        </pre>,
      )
      continue
    }

    const h = /^(#{1,3})\s+(.*)$/.exec(line)
    if (h) {
      const level = h[1].length
      const cls = level === 1 ? 'mt-6 text-2xl font-bold' : level === 2 ? 'mt-6 text-lg font-semibold text-slate-900' : 'mt-4 font-semibold'
      blocks.push(<div key={key++} role="heading" aria-level={level + 1} className={cls}>{inline(h[2])}</div>)
      i++
      continue
    }

    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, ''))
      blocks.push(
        <ul key={key++} className="my-3 list-disc space-y-1 pl-6">
          {items.map((t, n) => <li key={n}>{inline(t)}</li>)}
        </ul>,
      )
      continue
    }

    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+\.\s+/, ''))
      blocks.push(
        <ol key={key++} className="my-3 list-decimal space-y-1 pl-6">
          {items.map((t, n) => <li key={n}>{inline(t)}</li>)}
        </ol>,
      )
      continue
    }

    if (line.trim() === '') { i++; continue }

    const para: string[] = []
    while (
      i < lines.length && lines[i].trim() !== '' && !lines[i].trim().startsWith('```') &&
      !/^#{1,3}\s+/.test(lines[i]) && !/^\s*[-*]\s+/.test(lines[i]) && !/^\s*\d+\.\s+/.test(lines[i])
    ) para.push(lines[i++])
    blocks.push(<p key={key++} className="my-3 leading-relaxed">{inline(para.join(' '))}</p>)
  }

  return <div className="text-slate-800">{blocks}</div>
}
