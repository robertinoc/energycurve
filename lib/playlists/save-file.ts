/**
 * Saving a generated playlist file from the browser — on phones as well as
 * desktops.
 *
 * The obvious implementation (blob URL, anchor with `download`, click, revoke)
 * has two failure modes that only appear on iOS, which is exactly where a DJ
 * checking a set from bed actually is:
 *
 * 1. Revoking the object URL right after `.click()` cancels the download. The
 *    click only *starts* an asynchronous read of the blob; desktop Chrome
 *    happens to capture it synchronously, Safari does not.
 * 2. iOS Safari ignores the `download` attribute on a blob URL. It navigates to
 *    the blob instead, so the user lands on a screen of raw XML with no way to
 *    keep it.
 *
 * The answer to the second is the Web Share API: on iOS it opens the native
 * sheet with "Save to Files", which is the thing the user was reaching for.
 */

export type SaveStrategy = "share" | "anchor"

export interface SaveEnvironment {
  /** `navigator.canShare({ files })` accepted a file shaped like ours. */
  canShareFiles: boolean
  /**
   * iOS or iPadOS. Deliberately a user-agent judgement and not a feature test:
   * no feature reports "this browser ignores `download` on blob URLs", which is
   * the only thing we actually need to know. Naming that plainly beats dressing
   * it up as detection.
   */
  isAppleTouchDevice: boolean
}

/**
 * Share only where the anchor is known to fail. On a desktop the share sheet is
 * the worse answer — someone exporting a playlist wants it in a folder, not
 * handed to another app — and Chrome on Windows would happily offer it.
 */
export function preferredSaveStrategy(env: SaveEnvironment): SaveStrategy {
  return env.isAppleTouchDevice && env.canShareFiles ? "share" : "anchor"
}

/** How long the blob URL stays alive so the download can latch onto it. */
export const REVOKE_DELAY_MS = 30_000

export function detectAppleTouchDevice(nav: {
  platform?: string
  maxTouchPoints?: number
}): boolean {
  const platform = nav.platform ?? ""

  // iPadOS reports "MacIntel" and is only tellable from a desktop Mac by having
  // touch points.
  const iPadOS = platform === "MacIntel" && (nav.maxTouchPoints ?? 0) > 1

  return /iP(hone|ad|od)/.test(platform) || iPadOS
}

export function detectCanShareFiles(
  nav: { canShare?: (data: { files: File[] }) => boolean },
  probe: File
): boolean {
  if (typeof nav.canShare !== "function") {
    return false
  }

  try {
    return nav.canShare({ files: [probe] })
  } catch {
    // Some engines throw rather than returning false for a shape they don't
    // support.
    return false
  }
}

export type SaveOutcome = "shared" | "downloaded" | "cancelled"

/**
 * Call this straight from a user gesture. `navigator.share` requires one, and
 * awaiting anything beforehand spends it — which is why the File is built up
 * front and nothing happens between the gesture and the share call.
 */
export async function saveTextFile(
  filename: string,
  mimeType: string,
  content: string
): Promise<SaveOutcome> {
  const type = `${mimeType};charset=utf-8`
  const file = new File([content], filename, { type })

  const strategy = preferredSaveStrategy({
    canShareFiles: detectCanShareFiles(navigator, file),
    isAppleTouchDevice: detectAppleTouchDevice(navigator),
  })

  if (strategy === "share") {
    try {
      await navigator.share({ files: [file] })
      return "shared"
    } catch (error) {
      // Dismissing the sheet is a decision, not a failure: falling through to a
      // download would hand them the file they just declined.
      if (error instanceof DOMException && error.name === "AbortError") {
        return "cancelled"
      }
      // Anything else still deserves the anchor attempt rather than nothing.
    }
  }

  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = filename
  anchor.rel = "noopener"
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()

  // Deferred on purpose. Revoking before the download reads the blob cancels
  // it; the timer leaks one URL for half a minute, which is by far the cheaper
  // of the two mistakes.
  window.setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS)

  return "downloaded"
}
