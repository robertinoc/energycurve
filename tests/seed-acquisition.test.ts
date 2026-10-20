import { describe, expect, it } from "vitest"

import {
  cohortsBySource,
  firstAnalysisTiming,
  paidConversion,
  signupsByToolLanding,
} from "@/lib/backstage/acquisition"
import { buildBackstageUsers } from "@/lib/backstage/users"

import { ACQUISITION_EPOCH, generateAcquisition } from "../scripts/seed-scale.mjs"

/**
 * The acquisition scenario counts its own expected numbers with plain loops
 * over its design. Here the same rows go through the backstage's real code, in
 * memory. If the two disagree, either the scenario or the panel is wrong — and
 * the dev run (tests/perf/acquisition.perf.ts) would be comparing against a
 * wrong answer.
 */

const WINDOW_END = new Date(ACQUISITION_EPOCH + 6 * 7 * 86_400_000 - 1)

function throughThePanel(withFirstTouch: boolean) {
  const rows = generateAcquisition({ seed: 20, withFirstTouch })
  const users = buildBackstageUsers(
    rows.profiles.map((profile: Record<string, unknown>) => ({
      ...profile,
      suspended_at: null,
      last_seen_at: null,
      last_seen_country: null,
    })) as never,
    rows.playlists,
    rows.analyses,
    new Map(),
    new Map(),
    {
      firstTouches: new Map(
        rows.profiles.map((profile: Record<string, unknown>) => [
          profile.id as string,
          {
            first_touch_source: (profile.first_touch_source as string) ?? null,
            first_touch_medium: (profile.first_touch_medium as string) ?? null,
            first_touch_landing: (profile.first_touch_landing as string) ?? null,
          },
        ])
      ),
      paidAt: new Map(
        rows.billingEvents.map((event: { profile_id: string; processed_at: string }) => [
          event.profile_id,
          event.processed_at,
        ])
      ),
    }
  )

  return { users, expected: rows.expected }
}

describe("the acquisition scenario, through the panel's code", () => {
  for (const withFirstTouch of [false, true]) {
    it(`agrees with its own count ${withFirstTouch ? "with" : "without"} first touches`, () => {
      const { users, expected } = throughThePanel(withFirstTouch)
      const measurement = withFirstTouch
        ? { available: true, since: "2025-01-01T00:00:00Z" }
        : { available: false, since: null }
      const inputs = users.map((user) => ({ ...user }))

      const cohorts = cohortsBySource(inputs, measurement, WINDOW_END, 6)
      const perWeek = Object.fromEntries(
        cohorts.rows.filter((row) => row.week !== "earlier").map((row) => [row.week, row.total])
      )
      const bySource = Object.fromEntries(
        cohorts.sources.map((source) => [
          source,
          cohorts.rows.reduce((sum, row) => sum + (row.bySource[source] ?? 0), 0),
        ])
      )
      const timing = firstAnalysisTiming(users, WINDOW_END)
      const paid = paidConversion(inputs)

      expect(perWeek).toEqual(expected.perWeek)
      expect(bySource).toEqual(expected.bySource)
      expect(timing.reached.count).toBe(expected.analysed)
      expect(timing.never).toBe(expected.never)
      expect(timing.neverUsed).toBe(expected.neverUsed)
      expect(timing.importedOnly).toBe(expected.importedOnly)
      expect(timing.medianHours).toBe(expected.medianHoursToFirstAnalysis)
      expect(paid.paid.count).toBe(expected.paid)
      expect(paid.medianDays).toBe(expected.medianDaysToPay)
      expect(paid.paidWithoutCheckout).toBe(expected.paidWithoutCheckout)
      expect(
        signupsByToolLanding(inputs).rows.find((row) => row.tool === "energy_curve")?.signups
      ).toBe(expected.landedOnEnergyCurve)
    })
  }
})
