import { describe, expect, it } from "vitest"

import {
  analyzeEmphasis,
  showsAnalyzeNextStep,
  type AnalysisStatus,
} from "@/lib/playlists/analyze-prompt"

/**
 * What the playlist page offers depends on whether the set was ever analysed
 * (step 1.2 of docs/conversion-plan.md). These are the rules on their own; the
 * markup that follows from them is in tests/playlist-analyze-states.test.ts.
 */

describe("which action leads the playlist page", () => {
  it("a set nobody analysed leads with the analysis", () => {
    expect(analyzeEmphasis({ status: "never", trackCount: 12 })).toBe("lead")
  })

  it("a set that has an analysis keeps the row it always had", () => {
    expect(analyzeEmphasis({ status: "analyzed", trackCount: 12 })).toBe("peer")
  })

  it("a failed read never turns into a push", () => {
    // Pushing at someone who analysed the set ten times is the wrong mistake
    // to make when the database hiccups.
    expect(analyzeEmphasis({ status: "unknown", trackCount: 12 })).toBe("peer")
  })

  it("a set too short to analyse is not pushed towards an analysis", () => {
    expect(analyzeEmphasis({ status: "never", trackCount: 0 })).toBe("peer")
    expect(analyzeEmphasis({ status: "never", trackCount: 1 })).toBe("peer")
    expect(analyzeEmphasis({ status: "never", trackCount: 2 })).toBe("lead")
  })
})

describe("when the page says what the analysis gives", () => {
  const arrived = { status: "never" as AnalysisStatus, trackCount: 12, justImported: true }

  it("says it on arrival from an import", () => {
    expect(showsAnalyzeNextStep(arrived)).toBe(true)
  })

  it("does not say it again on a later visit", () => {
    expect(showsAnalyzeNextStep({ ...arrived, justImported: false })).toBe(false)
  })

  it("has nothing to say once the set was analysed", () => {
    expect(showsAnalyzeNextStep({ ...arrived, status: "analyzed" })).toBe(false)
  })

  it("stays quiet when it does not know", () => {
    expect(showsAnalyzeNextStep({ ...arrived, status: "unknown" })).toBe(false)
  })

  it("does not offer an analysis the set cannot have", () => {
    expect(showsAnalyzeNextStep({ ...arrived, trackCount: 1 })).toBe(false)
  })
})
