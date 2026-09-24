/** Text statistics for the status bar.
 *
 *  These run on every content change, i.e. on every keystroke, so they must not
 *  allocate per call: `content.split(/\s+/)` materialises one string per word
 *  (measured ~3.7 ms on a 560 KB document, and worse on a slow machine) where a
 *  single scan costs ~1 ms and no garbage. */

export function countWords(content: string): number {
  let words = 0;
  let inWord = false;
  for (let i = 0; i < content.length; i++) {
    const code = content.charCodeAt(i);
    // Whitespace per JavaScript's `\s`, which is what `split(/\s+/)` used.
    const whitespace =
      code === 32 ||
      (code >= 9 && code <= 13) ||
      code === 0xa0 ||
      code === 0x1680 ||
      (code >= 0x2000 && code <= 0x200a) ||
      code === 0x2028 ||
      code === 0x2029 ||
      code === 0x202f ||
      code === 0x205f ||
      code === 0x3000 ||
      code === 0xfeff;
    if (whitespace) {
      inWord = false;
    } else if (!inWord) {
      inWord = true;
      words++;
    }
  }
  return words;
}
