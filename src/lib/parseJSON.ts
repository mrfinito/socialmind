// Robust JSON parser that handles common AI response issues
export function robustParse(raw: string): unknown {
  // Just find the JSON object - everything between first { and last }
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  
  if (start === -1 || end === -1) {
    throw new Error('Brak JSON w odpowiedzi')
  }
  
  let clean = raw.slice(start, end + 1)
  
  // Try direct parse
  try { return JSON.parse(clean) } catch {}
  
  // Fix unescaped newlines inside string values
  const fixNewlines = (str: string) =>
    str.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')
  
  const fixed = clean.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, (m) => fixNewlines(m))
  try { return JSON.parse(fixed) } catch {}
  
  // Fix curly quotes
  const fixedQuotes = fixed
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/,(\s*[}\]])/g, '$1')
  try { return JSON.parse(fixedQuotes) } catch {}
  
  // Last resort: remove all literal newlines
  const noNewlines = clean.replace(/\r?\n/g, ' ')
  try { return JSON.parse(noNewlines) } catch {}

  throw new Error('Nie mozna przetworzyc odpowiedzi AI')
}
