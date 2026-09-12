import { existsSync, readFileSync, readdirSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Every relative link in the Auditoría360 documents has to resolve.
 *
 * The data room is the page a buyer opens first, and a dead link there costs
 * more than a missing document: it turns "here is our evidence" into "they did
 * not open their own index". The same is true of the launch checklist, which had
 * to be rewritten this week precisely because it pointed at a reality that no
 * longer existed.
 *
 * This check exists because writing the data room produced a broken link on the
 * first pass — to a document sitting in an open pull request. That is a real and
 * recurring situation, so it has an escape hatch: a line may name a document
 * without linking it, marked with the PR it lands with. Unlinked and honest
 * beats linked and broken.
 */

const DOCS = join(process.cwd(), "docs/audit360")

const files = readdirSync(DOCS)
  .filter((file) => file.endsWith(".md"))
  .map((file) => ({
    file,
    path: join(DOCS, file),
    text: readFileSync(join(DOCS, file), "utf8"),
  }))

/** Markdown links to a relative path — external URLs and anchors are not ours. */
function linksIn(text: string): string[] {
  return [...text.matchAll(/\]\(([^)]+)\)/g)]
    .map((match) => match[1])
    .filter((target) => !/^(https?:|#|mailto:)/.test(target))
}

describe("the audit360 documents were read", () => {
  it("finds them", () => {
    expect(files.length).toBeGreaterThan(3)
  })

  it("they link to each other", () => {
    const total = files.reduce((sum, doc) => sum + linksIn(doc.text).length, 0)

    expect(total).toBeGreaterThan(20)
  })
})

describe("every relative link resolves", () => {
  for (const doc of files) {
    const targets = linksIn(doc.text)

    if (targets.length === 0) {
      continue
    }

    it.each(targets)(`${doc.file} → %s`, (target) => {
      const resolved = resolve(dirname(doc.path), target.replace(/#.*$/, ""))

      expect(existsSync(resolved), `${doc.file} links to ${target}`).toBe(true)
    })
  }
})

describe("documents still in review are named, not linked", () => {
  it("marks each unlinked reference with the PR it lands with", () => {
    // The alternative is an index that is wrong for as long as review takes.
    // Naming the PR makes the gap self-closing rather than permanent.
    const dataRoom = files.find((doc) => doc.file === "data-room.md")

    expect(dataRoom).toBeDefined()

    const pendingMentions = [
      ...(dataRoom?.text.matchAll(/`([\w.-]+\.md)`(?!\])/g) ?? []),
    ].map((match) => match[1])

    for (const mention of pendingMentions) {
      const exists = existsSync(join(DOCS, mention))
      const declared = new RegExp(
        `\`${mention.replace(/\./g, "\\.")}\`[^\\n]*llega con el PR #\\d+`
      ).test(dataRoom?.text ?? "")

      expect(
        exists || declared,
        `data-room.md names ${mention} without linking it and without saying which PR it lands with`
      ).toBe(true)
    }
  })
})
