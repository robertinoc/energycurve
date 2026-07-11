import { describe, expect, it } from "vitest"

import { decodeUploadedText } from "@/lib/playlists/decode-upload"

/** Builds an ArrayBuffer with a UTF-16LE BOM followed by `text`. */
function utf16leWithBom(text: string): ArrayBuffer {
  const bytes = [0xff, 0xfe]
  for (const char of text) {
    const code = char.charCodeAt(0)
    bytes.push(code & 0xff, (code >> 8) & 0xff)
  }
  return new Uint8Array(bytes).buffer
}

function bytesToBuffer(bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer
}

describe("decodeUploadedText", () => {
  it("decodes a UTF-16LE file with a BOM (Rekordbox .txt) and strips the BOM", () => {
    const decoded = decodeUploadedText(utf16leWithBom("Track Title\tArtist"))
    expect(decoded).toBe("Track Title\tArtist")
    expect(decoded.charCodeAt(0)).not.toBe(0xfeff)
  })

  it("decodes plain UTF-8 without a BOM (XML/NML/m3u8)", () => {
    const buffer = new TextEncoder().encode("<NML></NML>").buffer
    expect(decodeUploadedText(buffer)).toBe("<NML></NML>")
  })

  it("strips a UTF-8 BOM when present", () => {
    // EF BB BF + "hi"
    const decoded = decodeUploadedText(bytesToBuffer([0xef, 0xbb, 0xbf, 0x68, 0x69]))
    expect(decoded).toBe("hi")
  })

  it("decodes a UTF-16BE file with a BOM", () => {
    // FE FF + "Hi" big-endian
    const decoded = decodeUploadedText(
      bytesToBuffer([0xfe, 0xff, 0x00, 0x48, 0x00, 0x69])
    )
    expect(decoded).toBe("Hi")
  })
})
