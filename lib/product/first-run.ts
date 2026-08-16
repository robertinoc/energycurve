/**
 * The three steps a new user has to walk to get value out of EnergyCurve.
 *
 * Derived, never stored. Each step's "done" is read from data the dashboard
 * already loads, which buys two things worth more than the simplicity: there is
 * no dismissal flag to migrate, and the checklist cannot lie. A stored flag
 * drifts — someone deletes their only playlist and the guide still insists they
 * imported one — while a derived one is correct by construction, including when
 * it has to reappear.
 *
 * It disappears on its own once the third step is done, so nobody has to design
 * a "hide this" affordance for something that stops being true.
 */

export type FirstRunStepId = "import" | "analyze" | "improve"

export interface FirstRunStep {
  id: FirstRunStepId
  done: boolean
}

export interface FirstRunState {
  steps: FirstRunStep[]
  /** Index of the step to point at, or -1 when there's nothing left to do. */
  currentIndex: number
  /** False once every step is done — the whole guide stops rendering. */
  visible: boolean
}

export interface FirstRunInput {
  playlistCount: number
  /**
   * Analyses recorded per playlist, newest playlist first — exactly the
   * `scoreHistory` the dashboard already has.
   */
  scoreHistories: readonly (readonly number[])[]
}

/**
 * Reads the three steps out of existing dashboard data.
 *
 * The third step is "analyse it again", not "export it". Export is the obvious
 * end of the loop but nothing records that it happened, and a checklist item
 * that can never tick is worse than one that doesn't exist. Re-analysing is
 * both detectable *and* the moment the product actually pays off: it means the
 * DJ changed something because of what we told them.
 */
export function computeFirstRun(input: FirstRunInput): FirstRunState {
  // The dashboard only loads the newest few playlists, so with more than that
  // the histories are a sample rather than the whole truth — and a sample can't
  // prove an absence. Someone who has been here long enough to keep six sets is
  // not on their first run, and guessing wrong here means telling an established
  // user to go analyse something they already analysed.
  if (input.playlistCount > input.scoreHistories.length) {
    return {
      steps: [
        { id: "import", done: true },
        { id: "analyze", done: true },
        { id: "improve", done: true },
      ],
      currentIndex: -1,
      visible: false,
    }
  }

  const analysed = input.scoreHistories.some((history) => history.length >= 1)
  const improved = input.scoreHistories.some((history) => history.length >= 2)

  const steps: FirstRunStep[] = [
    { id: "import", done: input.playlistCount > 0 },
    { id: "analyze", done: analysed },
    { id: "improve", done: improved },
  ]

  const currentIndex = steps.findIndex((step) => !step.done)

  return {
    steps,
    currentIndex,
    visible: currentIndex !== -1,
  }
}
