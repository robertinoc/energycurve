# Product Feature 01 — Manual Playlist Input

## Why This Is Next

The strategy already includes manual playlist input in MVP scope, so this is the cleanest first real product feature after setup and auth.

It gives EnergyCurve:

- the first real user-owned object
- the first true product workflow beyond auth
- the data foundation required for future analysis, scoring, and recommendations

## Feature Goal

Let an authenticated user create a playlist manually and add tracks with:

- track name
- artist
- BPM
- optional energy score
- track order / position

## MVP Outcome

After this feature, a user should be able to:

1. create a playlist
2. choose genre and context
3. add tracks manually
4. persist that data to Supabase
5. revisit the playlist in the dashboard

## Scope

### Include

- playlist creation
- playlist listing in the dashboard
- playlist detail screen
- manual track entry
- editing/removing tracks
- stable ordering by `position`

### Exclude

- automatic scoring
- curve analysis engine
- recommendations engine
- DJ software integrations
- bulk import
- drag-and-drop polish

## Suggested Delivery Order

### Phase 1

- playlist creation form
- list user playlists
- persist `name`, `genre`, `context`, `user_id`

### Phase 2

- playlist detail route
- add/edit/remove tracks
- persist `artist`, `name`, `bpm`, `energy_score`, `position`

### Phase 3

- show real playlist and track data in the dashboard
- keep analysis surfaces explicitly placeholder-driven until the scoring engine exists

## Definition Of Done

- authenticated user can create a playlist
- authenticated user can add and edit tracks manually
- playlist data persists correctly in Supabase
- server-side ownership boundaries remain intact
- dashboard starts showing real playlist data instead of only scaffolding

## Recommended Next Branch

`Manual Playlist Input + Playlist Detail`

