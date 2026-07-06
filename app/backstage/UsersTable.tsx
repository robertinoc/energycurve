"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import type { BackstageUserRow } from "@/lib/backstage/users"

type PendingAction =
  | { type: "suspend"; user: BackstageUserRow }
  | { type: "reactivate"; user: BackstageUserRow }
  | { type: "delete"; user: BackstageUserRow }

const ACTION_COPY: Record<
  PendingAction["type"],
  { title: string; body: string; confirmLabel: string; destructive: boolean }
> = {
  suspend: {
    title: "Suspend this account?",
    body: "The user keeps their playlists and analyses, but logins are rejected and open sessions are kicked out of the dashboard. You can reactivate at any time.",
    confirmLabel: "Suspend account",
    destructive: false,
  },
  reactivate: {
    title: "Reactivate this account?",
    body: "The user will be able to log in and use the product again immediately.",
    confirmLabel: "Reactivate account",
    destructive: false,
  },
  delete: {
    title: "Delete this account?",
    body: "This removes the user from WorkOS and deletes their profile, playlists, and analysis history. There is no undo.",
    confirmLabel: "Delete forever",
    destructive: true,
  },
}

function formatDate(value: string | null) {
  if (!value) {
    return "—"
  }

  return new Date(value).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

export function UsersTable({ users }: { users: BackstageUserRow[] }) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [pending, setPending] = useState<PendingAction | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filteredUsers = useMemo(() => {
    const needle = query.trim().toLowerCase()

    if (!needle) {
      return users
    }

    return users.filter((user) => user.email.toLowerCase().includes(needle))
  }, [users, query])

  async function executePending() {
    if (!pending) {
      return
    }

    setBusy(true)
    setError(null)

    try {
      const response =
        pending.type === "delete"
          ? await fetch(`/api/backstage/users/${pending.user.id}`, {
              method: "DELETE",
            })
          : await fetch(`/api/backstage/users/${pending.user.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ suspended: pending.type === "suspend" }),
            })

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string
        } | null

        throw new Error(payload?.error ?? `Request failed (${response.status})`)
      }

      setPending(null)
      router.refresh()
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "The action failed. Try again."
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-3">
        <CardTitle>
          {query
            ? `${filteredUsers.length} of ${users.length} users`
            : `${users.length} users`}
        </CardTitle>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by email…"
          className="w-full sm:w-72"
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-ec-border font-mono text-[11px] font-bold uppercase tracking-[0.08em] text-ec-text-dim">
                <th className="px-3 py-2.5">Email</th>
                <th className="px-3 py-2.5">Joined</th>
                <th className="px-3 py-2.5">Last seen</th>
                <th className="px-3 py-2.5 text-right">Playlists</th>
                <th className="px-3 py-2.5 text-right">Analyses</th>
                <th className="px-3 py-2.5">Last analysis</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => {
                const suspended = user.suspendedAt !== null

                return (
                  <tr
                    key={user.id}
                    className="border-b border-ec-border/60 last:border-b-0"
                  >
                    <td className="px-3 py-3 font-medium text-ec-text">
                      {user.email}
                    </td>
                    <td className="px-3 py-3 text-ec-text-muted">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-3 py-3 text-ec-text-muted">
                      {formatDate(user.lastSeenAt)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-ec-text-muted">
                      {user.playlistCount}
                    </td>
                    <td className="px-3 py-3 text-right font-mono text-ec-text-muted">
                      {user.analysisCount}
                    </td>
                    <td className="px-3 py-3 text-ec-text-muted">
                      {formatDate(user.lastAnalysisAt)}
                    </td>
                    <td className="px-3 py-3">
                      {suspended ? (
                        <Badge variant="warning">Suspended</Badge>
                      ) : (
                        <Badge variant="accent">Active</Badge>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() =>
                            setPending({
                              type: suspended ? "reactivate" : "suspend",
                              user,
                            })
                          }
                        >
                          {suspended ? "Reactivate" : "Suspend"}
                        </Button>
                        <Button
                          variant="destructive"
                          size="xs"
                          onClick={() => setPending({ type: "delete", user })}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-3 py-10 text-center text-ec-text-dim"
                  >
                    No users match that search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </CardContent>

      {pending ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{ACTION_COPY[pending.type].title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-ec-text-muted">
                <span className="font-bold text-ec-text">
                  {pending.user.email}
                </span>{" "}
                — {pending.user.playlistCount} playlists,{" "}
                {pending.user.analysisCount} analyses.
              </p>
              <p className="text-sm text-ec-text-muted">
                {ACTION_COPY[pending.type].body}
              </p>
              <div className="flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  onClick={() => {
                    setPending(null)
                    setError(null)
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant={
                    ACTION_COPY[pending.type].destructive
                      ? "destructive"
                      : "secondary"
                  }
                  size="sm"
                  disabled={busy}
                  onClick={executePending}
                >
                  {busy ? "Working…" : ACTION_COPY[pending.type].confirmLabel}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </Card>
  )
}
