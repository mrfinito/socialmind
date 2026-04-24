// Robust JSON parser that handles common AI response issues
export function robustParse(raw: string): unknown {
  // Strip ALL markdown code block variants
  let clean = raw
    .replace(/`{3,}json/gi, '')  // ```json or ``` json
    .replace(/`{3,}/g, '')       // remaining ```
    .trim()

  // Try direct parse first
  try { return JSON.parse(clean) } catch {}

  // Extract JSON object
  const s = clean.indexOf('{')
  const e = clean.lastIndexOf('}')
  if (s === -1 || e === -1) throw new Error('Brak JSON w odpowiedzi')
  clean = clean.slice(s, e + 1)

  try { return JSON.parse(clean) } catch {}

  // Fix unescaped newlines inside string values
  const fixNewlines = (str: string) =>
    str.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')

  const fixed = clean.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, (m) => fixNewlines(m))
  try { return JSON.parse(fixed) } catch {}

  // Fix curly quotes
  const fixedQuotes = clean
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/,(\s*[}\]])/g, '$1')
  try { return JSON.parse(fixedQuotes) } catch {}

  // Last resort: remove all unescaped newlines
  const noNewlines = clean.replace(/(?<!\\)\n/g, ' ').replace(/(?<!\\)\r/g, ' ')
  try { return JSON.parse(noNewlines) } catch {}

  throw new Error('Nie mozna przetworzyc odpowiedzi AI')
}
