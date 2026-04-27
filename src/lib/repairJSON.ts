// Robust JSON repair for AI streaming responses.
// Tries progressively more aggressive strategies to recover JSON from
// AI output that may have unescaped quotes, newlines, trailing commas,
// or be truncated mid-stream.

import { jsonrepair } from 'jsonrepair'

interface RepairResult {
  parsed: unknown | null
  strategy: string  // which strategy succeeded (for logging)
}

export function repairAIJSON(rawText: string): RepairResult {
  // Step 1: extract { ... } from raw (AI may add markdown or preamble)
  const start = rawText.indexOf('{')
  const end = rawText.lastIndexOf('}')
  if (start === -1) return { parsed: null, strategy: 'no-json-found' }
  
  let candidate = end > start ? rawText.slice(start, end + 1) : rawText.slice(start)

  // Step 2: try direct parse
  try {
    return { parsed: JSON.parse(candidate), strategy: 'direct' }
  } catch {}

  // Step 3: fix newlines/tabs inside string values
  try {
    const fixed = candidate.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, (m) =>
      m.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
    )
    return { parsed: JSON.parse(fixed), strategy: 'newlines-fixed' }
  } catch {}

  // Step 4: remove trailing commas
  try {
    const noCommas = candidate.replace(/,(\s*[}\]])/g, '$1')
    return { parsed: JSON.parse(noCommas), strategy: 'trailing-commas-removed' }
  } catch {}

  // Step 5: count unclosed braces/brackets and close them (handles truncation)
  try {
    let repaired = candidate
    // Trim to last } or ] to discard incomplete trailing content
    const lastBrace = Math.max(repaired.lastIndexOf('}'), repaired.lastIndexOf(']'))
    if (lastBrace > 0) repaired = repaired.slice(0, lastBrace + 1)

    let openB = 0, openSq = 0, inStr = false, esc = false
    for (let i = 0; i < repaired.length; i++) {
      const ch = repaired[i]
      if (esc) { esc = false; continue }
      if (ch === '\\') { esc = true; continue }
      if (ch === '"') { inStr = !inStr; continue }
      if (inStr) continue
      if (ch === '{') openB++
      else if (ch === '}') openB--
      else if (ch === '[') openSq++
      else if (ch === ']') openSq--
    }
    while (openSq > 0) { repaired += ']'; openSq-- }
    while (openB > 0) { repaired += '}'; openB-- }
    repaired = repaired.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, (m) =>
      m.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
    )
    repaired = repaired.replace(/,(\s*[}\]])/g, '$1')
    return { parsed: JSON.parse(repaired), strategy: 'truncation-repaired' }
  } catch {}

  // Step 6: HEAVY ARTILLERY - jsonrepair library
  // Handles unescaped quotes inside string values, missing commas,
  // single quotes, Python-style booleans, comments, and many other AI quirks.
  try {
    const repaired = jsonrepair(candidate)
    return { parsed: JSON.parse(repaired), strategy: 'jsonrepair-lib' }
  } catch {}

  // Step 7: jsonrepair on the whole raw text (sometimes the slicing is wrong)
  try {
    const repaired = jsonrepair(rawText)
    return { parsed: JSON.parse(repaired), strategy: 'jsonrepair-raw' }
  } catch {}

  // Step 8: NUCLEAR OPTION - truncate to error position and re-close
  // If parser says "error at position 2379", we know everything up to ~2378 was valid.
  // Truncate, find a safe cut point (after last complete value), re-close all open structs.
  try {
    let errorPos = candidate.length
    try { JSON.parse(candidate) } catch (e) {
      const m = e instanceof Error ? e.message.match(/position (\d+)/) : null
      if (m) errorPos = parseInt(m[1])
    }
    
    // Find safe cut: walk back from errorPos to find last `,` or `}` or `]` outside strings
    let safeCut = -1
    let inStr = false, esc = false, depth = 0
    for (let i = 0; i < Math.min(errorPos, candidate.length); i++) {
      const ch = candidate[i]
      if (esc) { esc = false; continue }
      if (ch === '\\') { esc = true; continue }
      if (ch === '"') { inStr = !inStr; continue }
      if (inStr) continue
      if (ch === '{' || ch === '[') depth++
      else if (ch === '}' || ch === ']') depth--
      // Mark safe cut after each complete value (comma at depth>=1)
      if ((ch === ',' || ch === '}' || ch === ']') && depth >= 0) {
        safeCut = i
      }
    }
    
    if (safeCut > 0) {
      let truncated = candidate.slice(0, safeCut)
      // Remove trailing comma if present
      truncated = truncated.replace(/,\s*$/, '')
      // Re-close all open structures
      let openB = 0, openSq = 0
      let inStr2 = false, esc2 = false
      for (let i = 0; i < truncated.length; i++) {
        const ch = truncated[i]
        if (esc2) { esc2 = false; continue }
        if (ch === '\\') { esc2 = true; continue }
        if (ch === '"') { inStr2 = !inStr2; continue }
        if (inStr2) continue
        if (ch === '{') openB++
        else if (ch === '}') openB--
        else if (ch === '[') openSq++
        else if (ch === ']') openSq--
      }
      while (openSq > 0) { truncated += ']'; openSq-- }
      while (openB > 0) { truncated += '}'; openB-- }
      
      // Try direct parse first, then jsonrepair
      try {
        return { parsed: JSON.parse(truncated), strategy: 'truncated-at-error' }
      } catch {
        const repaired = jsonrepair(truncated)
        return { parsed: JSON.parse(repaired), strategy: 'truncated-then-repaired' }
      }
    }
  } catch {}

  return { parsed: null, strategy: 'all-failed' }
}
