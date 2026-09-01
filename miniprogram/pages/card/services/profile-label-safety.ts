// Unicode Cc (control) and Cf (format) ranges from Unicode 15.1.
// Keep these explicit instead of using /\p{...}/u: older Android mini-program
// JavaScript engines reject Unicode property escapes while parsing the module.
const CONTROL_OR_FORMAT_RANGES = [
  [0x0000, 0x001f],
  [0x007f, 0x009f],
  [0x00ad, 0x00ad],
  [0x0600, 0x0605],
  [0x061c, 0x061c],
  [0x06dd, 0x06dd],
  [0x070f, 0x070f],
  [0x0890, 0x0891],
  [0x08e2, 0x08e2],
  [0x180e, 0x180e],
  [0x200b, 0x200f],
  [0x202a, 0x202e],
  [0x2060, 0x2064],
  [0x2066, 0x206f],
  [0xfeff, 0xfeff],
  [0xfff9, 0xfffb],
  [0x110bd, 0x110bd],
  [0x110cd, 0x110cd],
  [0x13430, 0x1343f],
  [0x1bca0, 0x1bca3],
  [0x1d173, 0x1d17a],
  [0xe0001, 0xe0001],
  [0xe0020, 0xe007f],
] as const;

export function containsControlOrFormatCharacter(value: string): boolean {
  for (const character of Array.from(value)) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) continue;
    for (const [start, end] of CONTROL_OR_FORMAT_RANGES) {
      if (codePoint >= start && codePoint <= end) return true;
    }
  }
  return false;
}
