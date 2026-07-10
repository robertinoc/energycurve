"use client"

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react"
import { Check, ChevronDown, Plus, X } from "lucide-react"

import {
  createCustomTaxonomyAction,
  deleteCustomTaxonomyAction,
} from "@/app/dashboard/playlists/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { formatTemplate } from "@/lib/content/analysis-copy"
import { DASHBOARD_COPY } from "@/lib/content/dashboard-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { initialTaxonomyActionState } from "@/lib/playlists/action-state"
import { cn } from "@/lib/utils"

const COPY = DASHBOARD_COPY.taxonomy

export interface TaxonomyBaseOption {
  value: string
  label: string
}

export interface TaxonomyCustomOption {
  id: string
  name: string
  /** Display label of the base this custom behaves like. */
  behavesLikeLabel: string
}

interface TaxonomySelectProps {
  id: string
  /** Form field name; submits the base code or "custom:<id>". */
  name: string
  kind: "context" | "genre"
  locale: SiteLocale
  baseOptions: TaxonomyBaseOption[]
  customs: TaxonomyCustomOption[]
  defaultValue: string
  /** Extra leading option (the import card's auto-detect). */
  leadingOption?: { value: string; label: string; badge?: string }
  onValueChange?: (value: string) => void
}

/**
 * Grouped select for contexts/genres with user customs ("behaves like"
 * model): Standard + Yours groups, an "Add your own" row, and a small modal
 * to create the custom entry. Submits through a hidden input so the parent
 * form and server actions stay unchanged.
 */
export function TaxonomySelect({
  id,
  name,
  kind,
  locale,
  baseOptions,
  customs,
  defaultValue,
  leadingOption,
  onValueChange,
}: TaxonomySelectProps) {
  const [rawValue, setRawValue] = useState(defaultValue)
  const [open, setOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [, startRefresh] = useTransition()

  // If the selected custom entry was deleted (props refreshed without it),
  // fall back to the default so the form never submits a dangling id —
  // derived at render, no state sync needed.
  const value =
    rawValue.startsWith("custom:") &&
    !customs.some((entry) => `custom:${entry.id}` === rawValue)
      ? defaultValue
      : rawValue

  const selectedLabel = useMemo(() => {
    if (leadingOption && value === leadingOption.value) {
      return leadingOption.label
    }

    const custom = customs.find((entry) => `custom:${entry.id}` === value)

    if (custom) {
      return custom.name
    }

    return (
      baseOptions.find((option) => option.value === value)?.label ??
      baseOptions[0]?.label ??
      ""
    )
  }, [value, customs, baseOptions, leadingOption])

  function pick(next: string) {
    setRawValue(next)
    setOpen(false)
    onValueChange?.(next)
  }

  async function removeCustom(entryId: string) {
    await deleteCustomTaxonomyAction(kind, entryId)
    startRefresh(() => {
      // Server components re-render via revalidatePath; the render-derived
      // `value` falls back if the selection pointed at the deleted entry.
    })
  }

  return (
    <div className="relative">
      <input type="hidden" name={name} value={value} />

      <button
        type="button"
        id={id}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-full items-center justify-between gap-3 rounded-[13px] border border-white/14 bg-ec-raised px-3.5 text-left text-sm text-white transition-shadow hover:border-[#A24DE0]/55 hover:shadow-[0_0_0_3px_rgba(162,77,224,0.12)] focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/15"
      >
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="ec-gradient-bg size-2 shrink-0 rounded-[3px]" />
          <span className="truncate">{selectedLabel}</span>
          {leadingOption?.badge && value === leadingOption.value ? (
            <span className="shrink-0 rounded-[12px] border border-[#22D3EE]/35 bg-[#22D3EE]/[0.09] px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[#7DE6F7]">
              {leadingOption.badge}
            </span>
          ) : null}
        </span>
        <span
          aria-hidden
          className="grid size-6 shrink-0 place-items-center rounded-[7px] bg-white/[0.06] text-ec-text-dim"
        >
          <ChevronDown className="size-3.5" />
        </span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="listbox"
            className="absolute left-0 right-0 z-20 mt-1 max-h-80 overflow-y-auto rounded-2xl border border-white/14 bg-ec-raised shadow-[0_24px_60px_rgba(0,0,0,0.5)]"
          >
            {leadingOption ? (
              <DropdownRow
                selected={value === leadingOption.value}
                onClick={() => pick(leadingOption.value)}
              >
                <span className="truncate">{leadingOption.label}</span>
                {leadingOption.badge ? (
                  <span className="ml-auto shrink-0 rounded-[12px] border border-[#22D3EE]/35 bg-[#22D3EE]/[0.09] px-1.5 py-px font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-[#7DE6F7]">
                    {leadingOption.badge}
                  </span>
                ) : null}
              </DropdownRow>
            ) : null}

            <p className="px-4 pb-1 pt-3 font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-ec-text-dim">
              {COPY.groupStandard[locale]}
            </p>
            {baseOptions.map((option) => (
              <DropdownRow
                key={option.value}
                selected={value === option.value}
                onClick={() => pick(option.value)}
              >
                <span className="truncate">{option.label}</span>
              </DropdownRow>
            ))}

            {customs.length > 0 ? (
              <>
                <p className="px-4 pb-1 pt-3 font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-ec-text-dim">
                  {COPY.groupYours[locale]}
                </p>
                {customs.map((entry) => (
                  <DropdownRow
                    key={entry.id}
                    selected={value === `custom:${entry.id}`}
                    onClick={() => pick(`custom:${entry.id}`)}
                  >
                    <span className="truncate">{entry.name}</span>
                    <span className="ml-auto shrink-0 font-mono text-[10px] tracking-[0.06em] text-ec-text-dim">
                      {formatTemplate(COPY.behavesLikeHint[locale], {
                        base: entry.behavesLikeLabel.toLowerCase(),
                      })}
                    </span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={formatTemplate(
                        COPY.deleteEntryAria[locale],
                        { name: entry.name }
                      )}
                      className="grid size-5 shrink-0 place-items-center rounded-md text-ec-text-dim hover:bg-white/10 hover:text-ec-error"
                      onClick={(event) => {
                        event.stopPropagation()
                        void removeCustom(entry.id)
                      }}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault()
                          event.stopPropagation()
                          void removeCustom(entry.id)
                        }
                      }}
                    >
                      <X className="size-3" />
                    </span>
                  </DropdownRow>
                ))}
              </>
            ) : null}

            <button
              type="button"
              onClick={() => {
                setOpen(false)
                setModalOpen(true)
              }}
              className="flex w-full items-center gap-2.5 border-t border-ec-border px-4 py-3 text-left text-[13.5px] font-semibold text-[#CDA2F1] hover:bg-[#A24DE0]/[0.12]"
            >
              <span className="grid size-5.5 place-items-center rounded-lg border border-[#A24DE0]/40 bg-[#A24DE0]/[0.18] font-bold">
                <Plus className="size-3" />
              </span>
              {kind === "context"
                ? COPY.addContext[locale]
                : COPY.addGenre[locale]}
            </button>
          </div>
        </>
      ) : null}

      {modalOpen ? (
        <AddTaxonomyModal
          kind={kind}
          locale={locale}
          baseOptions={baseOptions}
          onClose={() => setModalOpen(false)}
          onCreated={(createdId) => {
            setModalOpen(false)
            pick(`custom:${createdId}`)
          }}
        />
      ) : null}
    </div>
  )
}

function DropdownRow({
  selected,
  onClick,
  children,
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <div
      role="option"
      aria-selected={selected}
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onClick()
        }
      }}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 px-4 py-2.5 text-sm text-white hover:bg-[#A24DE0]/[0.12]",
        selected && "bg-[#22D3EE]/[0.07]"
      )}
    >
      {children}
      {selected ? <Check className="ml-1 size-3.5 shrink-0 text-ec-cyan" /> : null}
    </div>
  )
}

function AddTaxonomyModal({
  kind,
  locale,
  baseOptions,
  onClose,
  onCreated,
}: {
  kind: "context" | "genre"
  locale: SiteLocale
  baseOptions: TaxonomyBaseOption[]
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const [state, formAction, isPending] = useActionState(
    createCustomTaxonomyAction,
    initialTaxonomyActionState
  )
  const [behavesLike, setBehavesLike] = useState(baseOptions[0]?.value ?? "")
  const handledCreation = useRef(false)

  useEffect(() => {
    if (state.ok && state.createdId && !handledCreation.current) {
      handledCreation.current = true
      onCreated(state.createdId)
    }
  }, [state, onCreated])

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4">
      <button
        type="button"
        aria-hidden
        tabIndex={-1}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-[18px] border border-white/14 bg-ec-surface p-5 shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
        <h3 className="font-heading text-[17px] font-semibold text-white">
          {kind === "context"
            ? COPY.modalContextTitle[locale]
            : COPY.modalGenreTitle[locale]}
        </h3>
        <p className="mt-1 text-[12.5px] text-ec-text-muted">
          {kind === "context"
            ? COPY.modalContextSub[locale]
            : COPY.modalGenreSub[locale]}
        </p>

        <form action={formAction} className="mt-4 space-y-4">
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="behavesLike" value={behavesLike} />

          <div className="space-y-2">
            <label
              htmlFor={`add-${kind}-name`}
              className="block font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-ec-text-dim"
            >
              {COPY.nameLabel[locale]}
            </label>
            <Input
              id={`add-${kind}-name`}
              name="name"
              maxLength={32}
              required
              autoFocus
              placeholder={
                kind === "context"
                  ? COPY.contextNamePlaceholder[locale]
                  : COPY.genreNamePlaceholder[locale]
              }
              className="border-white/14 bg-ec-raised text-white placeholder:text-white/32"
            />
          </div>

          <div className="space-y-2">
            <span className="block font-mono text-[10.5px] font-bold uppercase tracking-[0.16em] text-ec-text-dim">
              {COPY.feelsClosestTo[locale]}
            </span>
            <div className="flex flex-wrap gap-2">
              {baseOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setBehavesLike(option.value)}
                  className={cn(
                    "rounded-[20px] border px-3 py-1.5 text-[12.5px] transition-colors",
                    behavesLike === option.value
                      ? "border-[#22D3EE]/55 bg-[#22D3EE]/10 font-semibold text-[#7DE6F7]"
                      : "border-white/14 text-ec-text-muted hover:border-white/25"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11.5px] leading-relaxed text-ec-text-dim">
            {kind === "context"
              ? COPY.whyContext[locale]
              : COPY.whyGenre[locale]}
          </p>

          {!state.ok && state.message ? (
            <p className="text-sm text-ec-error">{state.message}</p>
          ) : null}

          <div className="flex justify-end gap-2.5">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              {COPY.cancel[locale]}
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? COPY.creating[locale] : COPY.create[locale]}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
