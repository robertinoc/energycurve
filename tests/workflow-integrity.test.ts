import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * The build pipeline as a thing that can be attacked.
 *
 * CI checks out the repository, installs the dependency tree — running every
 * package's install scripts — and runs a browser. Anything that executes in
 * that job executes with the repository present and the token in scope, which
 * makes the workflow files part of the security surface rather than
 * configuration around it.
 *
 * These checks are static and cheap, and each exists because the thing it
 * prevents is invisible in review: a tag silently repointed upstream, a
 * `permissions:` block that was never written, a `pull_request_target` added to
 * make a fork's PR work.
 */

const WORKFLOW_DIR = join(process.cwd(), ".github/workflows")

/**
 * Comments removed, because a check that reads them measures the wrong thing.
 *
 * This is not hypothetical: the `persist-credentials` assertion below passed
 * against a workflow that did not set it, because the docblock *above* the
 * checkout step explains why it is set — and the regex found the explanation.
 * The mutation that should have turned it red left all ten green.
 *
 * `tests/protected-routes.test.ts` hit the identical bug reading `withAuth(`
 * out of a comment. Twice is a pattern, so this one is a named function with
 * its own tests rather than an inline `.replace` nobody looks at again.
 *
 * Deliberately naive — everything after an unquoted `#` goes. That is correct
 * for these files (no `run:` script or expression here contains one) and the
 * tests below pin both directions so a future workflow that breaks the
 * assumption fails here rather than silently.
 */
export function stripComments(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const hash = line.indexOf("#")

      return hash === -1 ? line : line.slice(0, hash)
    })
    .join("\n")
}

const workflows = readdirSync(WORKFLOW_DIR)
  .filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"))
  .map((file) => {
    const text = readFileSync(join(WORKFLOW_DIR, file), "utf8")

    // `text` keeps the comments, because the SHA pins are *documented* by the
    // trailing `# vX.Y.Z` and that check has to see it. `code` is what every
    // assertion about configuration reads.
    return { file, text, code: stripComments(text) }
  })

/** Every `uses:` line, with the workflow it came from. */
const uses = workflows.flatMap(({ file, text }) =>
  text
    .split("\n")
    .map((line, index) => ({ file, line: line.trim(), number: index + 1 }))
    .filter(({ line }) => /^-?\s*uses:/.test(line))
)

const SHA_PINNED = /uses:\s*\S+@[0-9a-f]{40}(\s|$)/

describe("the workflows exist and are read", () => {
  it("finds them", () => {
    expect(workflows.length).toBeGreaterThan(0)
    expect(uses.length).toBeGreaterThan(0)
  })
})

describe("third-party actions are pinned to a commit", () => {
  it("never uses a mutable tag", () => {
    // `actions/checkout@v4` is a pointer the owner can move. Whoever controls
    // the tag controls what runs in a job that has this repository checked out.
    const unpinned = uses.filter(({ line }) => !SHA_PINNED.test(line))

    expect(unpinned.map((entry) => `${entry.file}:${entry.number} ${entry.line}`)).toEqual([])
  })

  it("says which version each SHA is", () => {
    // A bare 40-character hash is unreviewable. The trailing comment is what
    // makes "bumped checkout from 4.4.0 to 4.5.0" legible in a diff, and
    // Dependabot rewrites both together.
    const undocumented = uses.filter(({ line }) => !/#\s*v\d+\.\d+\.\d+/.test(line))

    expect(undocumented.map((entry) => `${entry.file}:${entry.number}`)).toEqual([])
  })
})

describe("least privilege", () => {
  it("declares permissions in every workflow", () => {
    // The repository default is already `read`, but that setting lives in
    // GitHub's UI and nothing in this repo would notice it changing.
    const missing = workflows
      .filter(({ code }) => !/^permissions:/m.test(code))
      .map(({ file }) => file)

    expect(missing).toEqual([])
  })

  it("never grants write to contents", () => {
    const writers = workflows
      .filter(({ code }) => /contents:\s*write/.test(code))
      .map(({ file }) => file)

    expect(writers).toEqual([])
  })

  it("does not leave the token in .git/config before installing dependencies", () => {
    // checkout persists the token by default. The step after it is `npm ci`,
    // which runs install scripts from the whole dependency tree — any one of
    // which could read the token and push with it.
    const checkouts = workflows.filter(({ code }) =>
      code.includes("actions/checkout@")
    )

    // Guarded, because an empty list would make the loop below pass by doing
    // nothing — the other half of how this check first fooled itself.
    expect(checkouts.length).toBeGreaterThan(0)

    for (const { file, code } of checkouts) {
      expect(code, file).toMatch(/persist-credentials:\s*false/)
    }
  })
})

describe("the two workflow footguns", () => {
  it("never uses pull_request_target", () => {
    // It runs the BASE branch's workflow with a writable token, in the context
    // of a fork's pull request. Every published GitHub Actions compromise of
    // this shape starts here.
    const offenders = workflows
      .filter(({ code }) => /pull_request_target/.test(code))
      .map(({ file }) => file)

    expect(offenders).toEqual([])
  })

  it("never interpolates attacker-controlled text into a shell", () => {
    // `run: echo ${{ github.event.pull_request.title }}` is command injection:
    // the title is written by whoever opened the PR, and it is substituted into
    // the script before the shell sees it.
    const dangerous =
      /\$\{\{\s*github\.event\.(pull_request|issue|comment|head_commit)\./

    const offenders = workflows
      .filter(({ code }) => dangerous.test(code))
      .map(({ file }) => file)

    expect(offenders).toEqual([])
  })
})

describe("tools installed at build time", () => {
  it("pins the semgrep version", () => {
    // It installs an executable from PyPI and runs it as a merge gate. Unpinned,
    // the version deciding whether a pull request merges is whatever was
    // published that morning.
    const ci = workflows.find(({ file }) => file === "ci.yml")

    expect(ci).toBeDefined()
    expect(ci?.code).toMatch(/pipx install semgrep==\d+\.\d+\.\d+/)
  })
})

describe("the pins have a watcher", () => {
  const dependabot = readFileSync(join(process.cwd(), ".github/dependabot.yml"), "utf8")

  it("watches github-actions", () => {
    // A SHA never updates itself. Pinning without this trades one supply-chain
    // problem for a slower one: still running a vulnerability that was fixed.
    expect(dependabot).toMatch(/package-ecosystem:\s*github-actions/)
  })
})

describe("the comment stripper, pinned in both directions", () => {
  it("removes a line that only explains the setting", () => {
    const sample = stripComments(
      "# persist-credentials: false because npm ci runs next\n  uses: actions/checkout@abc"
    )

    expect(sample).not.toMatch(/persist-credentials/)
    expect(sample).toContain("actions/checkout@abc")
  })

  it("removes a trailing comment without eating the setting before it", () => {
    const sample = stripComments("  persist-credentials: false # keeps npm ci honest")

    expect(sample).toMatch(/persist-credentials:\s*false/)
    expect(sample).not.toMatch(/honest/)
  })

  it("leaves a line with no comment alone", () => {
    expect(stripComments("  contents: read")).toBe("  contents: read")
  })
})
