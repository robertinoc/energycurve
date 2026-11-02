import type { SalesWall } from "@/lib/product/sales-walls"

export interface PlaylistActionState {
  ok: boolean
  message: string | null
  fieldErrors: Record<string, string> | null
  /**
   * Set when the refusal is a plan limit the form should answer with a sales
   * wall instead of an error line. `message` still carries the sentence, so a
   * form that doesn't know the wall still says why.
   */
  wall?: SalesWall | null
}

export const initialPlaylistActionState: PlaylistActionState = {
  ok: false,
  message: null,
  fieldErrors: null,
}

/** State for the create-custom-context/genre modal actions. */
export interface TaxonomyActionState {
  ok: boolean
  message: string | null
  /** Id of the entry just created, so the select can auto-pick it. */
  createdId: string | null
}

export const initialTaxonomyActionState: TaxonomyActionState = {
  ok: false,
  message: null,
  createdId: null,
}
