/**
 * Decodes an uploaded playlist file to text, honoring its byte-order mark.
 *
 * DJ software isn't consistent about encoding: Rekordbox XML/NML and m3u8 are
 * UTF-8, but Rekordbox' ".txt" playlist export is UTF-16 (LE, with a BOM). The
 * default `File.text()` always assumes UTF-8, which turns a UTF-16 file into
 * mojibake. This sniffs the BOM and picks the right decoder, stripping the BOM
 * so downstream parsers see clean text.
 */
export function decodeUploadedText(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)

  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder("utf-16le").decode(bytes.subarray(2))
  }

  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder("utf-16be").decode(bytes.subarray(2))
  }

  if (
    bytes.length >= 3 &&
    bytes[0] === 0xef &&
    bytes[1] === 0xbb &&
    bytes[2] === 0xbf
  ) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3))
  }

  return new TextDecoder("utf-8").decode(bytes)
}
