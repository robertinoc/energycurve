export interface PlaylistActionState {
  ok: boolean
  message: string | null
  fieldErrors: Record<string, string> | null
}

export const initialPlaylistActionState: PlaylistActionState = {
  ok: false,
  message: null,
  fieldErrors: null,
}
