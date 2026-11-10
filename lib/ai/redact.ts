// Removes personal identifiers before report text leaves the server.
// Known names (prosecutors, case parties) are replaced with stable placeholders so the
// summary can still say "[PERSON-2] closed two cases" and the Woreda Coordinator can map them back.

export type Redaction = { text: string; map: Record<string, string> };

const PATTERNS: [RegExp, string][] = [
  [/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, '[EMAIL]'],
  [/(\+?251[\s-]?)?\b0?9\d{2}[\s-]?\d{3}[\s-]?\d{3}\b/g, '[PHONE]'],
  [/\bSOZ\/[A-Z]{2}\/\d{3,5}\/\d{4}\b/g, '[CASE-NO]'],
  [/\b(TB|TC|TA)[A-Z0-9]{6,10}\b/g, '[TXN-ID]'],
  [/\b\d{12,16}\b/g, '[ID-NUMBER]'],
];

export function redact(input: string, names: string[], map: Record<string, string> = {}): Redaction {
  let text = input;
  const sorted = Array.from(new Set(names.map(n => n.trim()).filter(n => n.length >= 3))).sort((a, b) => b.length - a.length);
  for (const name of sorted) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(escaped, 'gi');
    if (!re.test(text)) continue;
    if (!map[name]) map[name] = `[PERSON-${Object.keys(map).length + 1}]`;
    text = text.replace(re, map[name]);
  }
  for (const [re, ph] of PATTERNS) text = text.replace(re, ph);
  return { text, map };
}
