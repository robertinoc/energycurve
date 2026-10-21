import { readFileSync, writeFileSync } from "node:fs"

import { describe, expect, it, vi } from "vitest"

import {
  ACQUISITION_EPOCH,
  assertDevTarget,
  generateAcquisition,
} from "../../scripts/seed-scale.mjs"

/**
 * Lote 20, tasks 4–8, against the dev database: the backstage acquisition
 * panel's numbers, read by the real service, compared with what the
 * acquisition scenario wrote.
 *
 *   node scripts/seed-scale.mjs acquisition --seed 20
 *   npx vitest run --config vitest.perf.config.ts tests/perf/acquisition.perf.ts
 *   node scripts/seed-scale.mjs clean --seed 20
 *
 * The scenario lives in weeks nobody else signed up in (the seeder refuses
 * otherwise), so the cohort rows are compared with the whole snapshot, not a
 * filtered one: a read that missed or duplicated a user would show here.
 */

vi.mock("@workos-inc/authkit-nextjs", () => ({ withAuth: vi.fn(), getWorkOS: vi.fn() }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: (fn: unknown) => fn }))

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const match = line.match(/^(?:export\s+)?([A-Z0-9_]+)=(.*)$/)
  if (match && process.env[match[1]] === undefined) {
    process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "")
  }
}
assertDevTarget(process.env.SUPABASE_URL)

const SEED = Number(process.env.ACQUISITION_SEED ?? 20)
const WINDOW_END = new Date(ACQUISITION_EPOCH + 6 * 7 * 86_400_000 - 1)

const { getBackstageUsersSnapshot } = await import("@/services/backstage-service")
const {
  cohortsBySource,
  conversionBySource,
  firstAnalysisTiming,
  paidConversion,
} = await import("@/lib/backstage/acquisition")

describe("the acquisition panel against dev", () => {
  it("shows what the scenario seeded", async () => {
    const snapshot = await getBackstageUsersSnapshot()
    const withFirstTouch = snapshot.acquisition.measurement.available
    const { expected } = generateAcquisition({ seed: SEED, withFirstTouch })
    const seeded = snapshot.users.filter((user) =>
      user.email.startsWith(`scale-seed-${SEED}-acq-`)
    )

    const cohorts = cohortsBySource(snapshot.users, snapshot.acquisition.measurement, WINDOW_END, 6)
    const perWeek = Object.fromEntries(
      cohorts.rows.filter((row) => row.week !== "earlier").map((row) => [row.week, row.total])
    )
    const timing = firstAnalysisTiming(seeded, WINDOW_END)
    const paid = paidConversion(seeded)
    const conversion = conversionBySource(seeded)

    const observed = {
      measurement: snapshot.acquisition.measurement,
      counts: snapshot.acquisition.counts,
      totalUsers: snapshot.users.length,
      seededUsers: seeded.length,
      perWeek,
      unknownByReason: cohorts.unknownByReason,
      analysed: timing.reached.count,
      never: timing.never,
      neverUsed: timing.neverUsed,
      importedOnly: timing.importedOnly,
      medianHoursToFirstAnalysis: timing.medianHours,
      conversionOverall: conversion.overall,
      paid: paid.paid.count,
      medianDaysToPay: paid.medianDays,
      paidWithoutCheckout: paid.paidWithoutCheckout,
    }

    // The config keeps console output quiet; ACQUISITION_OUT=<file> keeps the
    // numbers for the record.
    if (process.env.ACQUISITION_OUT) {
      writeFileSync(process.env.ACQUISITION_OUT, JSON.stringify({ expected, observed }, null, 2))
    }

    expect(seeded).toHaveLength(expected.users)
    expect(perWeek).toEqual(expected.perWeek)
    expect(timing.reached.count).toBe(expected.analysed)
    expect(timing.never).toBe(expected.never)
    expect(timing.neverUsed).toBe(expected.neverUsed)
    expect(timing.importedOnly).toBe(expected.importedOnly)
    expect(timing.medianHours).toBe(expected.medianHoursToFirstAnalysis)
    expect(paid.paid.count).toBe(expected.paid)
    expect(paid.medianDays).toBe(expected.medianDaysToPay)
    expect(paid.paidWithoutCheckout).toBe(expected.paidWithoutCheckout)
    // The database's own count agrees with the rows the panel read.
    expect(snapshot.acquisition.counts.profiles).toBe(snapshot.users.length)
  })
})
