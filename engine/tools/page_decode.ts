// Ported from the ai-job-search framework (MIT License, Copyright (c)
// 2026 Mads Lorentzen). See engine/LICENSE.ai-job-search.
/**
 * Decode a saved web page by the charset it declares, the way a browser does.
 *
 * fetch_page.py saves the body exactly as the server sent it. Its readers,
 * `posting_guard --html` and `fetch_page --text`, decoded that file as
 * UTF-8 with replacement, so a posting served in EUC-KR, Shift_JIS or
 * windows-1252 reached the gate and the scorer as replacement characters.
 *
 * Valid UTF-8 always wins, so a page that decoded cleanly before decodes to the
 * same string. Only bytes that are not valid UTF-8 fall back to what the page
 * declares: a UTF-16 byte order mark, then `<meta charset>` or the http-equiv
 * Content-Type in the first 1024 bytes (the window the HTML prescan reads). A
 * label is mapped to the codec browsers use for it ("euc-kr" is read as CP949,
 * "iso-8859-1" as windows-1252). A missing or unknown label keeps UTF-8 with
 * replacement, and only the labels below are honoured, so a page cannot select
 * a codec such as UTF-7.
 */

const PRESCAN_BYTES = 1024;
const META_CHARSET = /<meta\b[^>]*?charset\s*=\s*["']?\s*([A-Za-z0-9._:-]+)/i;

// Label -> the WHATWG encoding name a browser (and TextDecoder) reads it as.
// Mirrors the Python tool's _CODECS table; the canonical names are the labels
// the standard TextDecoder accepts. Only these labels are honoured.
const CODECS: Record<string, string[]> = {
  "euc-kr": [
    "euc-kr",
    "cp949",
    "windows-949",
    "ks_c_5601-1987",
    "ks_c_5601-1989",
    "ksc5601",
    "ksc_5601",
    "korean",
    "iso-ir-149",
    "csksc56011987",
  ],
  shift_jis: ["shift_jis", "shift-jis", "sjis", "x-sjis", "ms_kanji", "ms932", "windows-31j", "csshiftjis"],
  "euc-jp": ["euc-jp", "x-euc-jp", "cseucpkdfmtjapanese"],
  "iso-2022-jp": ["iso-2022-jp", "csiso2022jp"],
  gb18030: ["gb18030", "gbk", "gb2312", "x-gbk", "chinese", "csgb2312", "iso-ir-58"],
  big5: ["big5", "big5-hkscs", "x-x-big5", "cn-big5", "csbig5"],
  "windows-1252": [
    "windows-1252",
    "cp1252",
    "x-cp1252",
    "iso-8859-1",
    "iso8859-1",
    "iso_8859-1",
    "latin1",
    "l1",
    "ascii",
    "us-ascii",
    "cp819",
    "ibm819",
  ],
  "windows-1250": ["windows-1250", "cp1250", "x-cp1250"],
  "windows-1251": ["windows-1251", "cp1251", "x-cp1251"],
  "windows-1253": ["windows-1253", "cp1253"],
  "windows-1254": ["windows-1254", "cp1254", "iso-8859-9", "latin5"],
  "windows-1257": ["windows-1257", "cp1257"],
  "iso-8859-2": ["iso-8859-2", "latin2", "l2"],
  "iso-8859-5": ["iso-8859-5", "cyrillic"],
  "iso-8859-15": ["iso-8859-15", "latin9", "l9"],
  "koi8-r": ["koi8-r", "koi8", "koi"],
  "koi8-u": ["koi8-u"],
};

const LABEL_TO_CODEC: Record<string, string> = {};
for (const [codec, labels] of Object.entries(CODECS)) {
  for (const label of labels) LABEL_TO_CODEC[label] = codec;
}

/** The codec a page declares through a UTF-16 BOM or a <meta> tag, or null. */
export function declaredCodec(raw: Uint8Array): string | null {
  if (raw.length >= 2 && ((raw[0] === 0xff && raw[1] === 0xfe) || (raw[0] === 0xfe && raw[1] === 0xff))) {
    return "utf-16";
  }
  const head = Buffer.from(raw.subarray(0, PRESCAN_BYTES)).toString("latin1");
  const match = META_CHARSET.exec(head);
  if (match === null) return null;
  return LABEL_TO_CODEC[match[1].toLowerCase()] ?? null;
}

/** Decode a `codec` label with replacement for undecodable bytes (TextDecoder's default). */
function decodeWith(raw: Uint8Array, codec: string): string {
  // For single-byte / multibyte legacy codecs, ignoreBOM keeps a leading BOM
  // in the output, matching Python's bytes.decode (which does not strip it).
  // For utf-16, the Python codec consumes the BOM for endianness and strips
  // it, so the default BOM handling (ignoreBOM: false) is correct there.
  const ignoreBOM = codec !== "utf-16";
  return new TextDecoder(codec, { ignoreBOM }).decode(raw);
}

/** Text of a saved page: UTF-8 when valid, else its declared charset, else UTF-8 with replacement. */
export function decodePage(raw: Uint8Array): string {
  try {
    // fatal: true throws on any byte that is not valid UTF-8, mirroring
    // Python's str.decode("utf-8") raising UnicodeDecodeError. ignoreBOM keeps
    // a leading BOM in the decoded string, as Python does.
    return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(raw);
  } catch {
    // fall through to the declared charset (or UTF-8 with replacement)
  }
  return decodeWith(raw, declaredCodec(raw) ?? "utf-8");
}
