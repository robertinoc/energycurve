"use client"

import { useState } from "react"
import { Check } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  PASSWORD_MIN_LENGTH,
  evaluatePassword,
  type PasswordStrength,
} from "@/lib/auth/password-policy"
import { formatTemplate } from "@/lib/content/analysis-copy"
import { PASSWORD_FIELD_COPY } from "@/lib/content/auth-copy"
import type { SiteLocale } from "@/lib/content/site-copy"
import { cn } from "@/lib/utils"

interface PasswordPolicyFieldProps {
  id: string
  name: string
  label: string
  placeholder: string
  locale: SiteLocale
  autoComplete?: string
  /**
   * Minimum to state and enforce. Defaults to the mirrored policy constant;
   * a rejection that carried WorkOS's own number raises it, so the rule the
   * user reads never contradicts the error they just got.
   */
  minLength?: number
}

const STRENGTH_META: Record<
  Exclude<PasswordStrength, "empty">,
  { filled: number; color: string; text: string; labelKey: keyof typeof PASSWORD_FIELD_COPY }
> = {
  weak: {
    filled: 1,
    color: "bg-[#F97066]",
    text: "text-[#FDA29B]",
    labelKey: "strengthWeak",
  },
  fair: {
    filled: 2,
    color: "bg-[#FDB022]",
    text: "text-[#FEC84B]",
    labelKey: "strengthFair",
  },
  strong: {
    filled: 3,
    color: "bg-[#32D583]",
    text: "text-[#6CE9A6]",
    labelKey: "strengthStrong",
  },
}

/**
 * Password input that states the policy before the user types and checks it
 * as they go, so a rejection happens here rather than after a round trip to
 * WorkOS. The server still validates — this is guidance, not the gate — but
 * `minLength` on the input means even a JS-less browser blocks the shortest
 * failure natively.
 */
export function PasswordPolicyField({
  id,
  name,
  label,
  placeholder,
  locale,
  autoComplete = "new-password",
  minLength = PASSWORD_MIN_LENGTH,
}: PasswordPolicyFieldProps) {
  const [value, setValue] = useState("")
  const evaluation = evaluatePassword(value, minLength)
  const requirementsId = `${id}-requirements`
  const strengthId = `${id}-strength`
  const hasInput = value.length > 0

  const rules = [
    {
      key: "length",
      text: formatTemplate(PASSWORD_FIELD_COPY.minLengthRule[locale], {
        min: minLength,
      }),
      met: evaluation.meetsMinLength,
    },
    {
      key: "common",
      text: PASSWORD_FIELD_COPY.notCommonRule[locale],
      met: hasInput && !evaluation.looksCommon,
    },
  ]

  const strengthMeta =
    evaluation.strength === "empty" ? null : STRENGTH_META[evaluation.strength]

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-white/82">
        {label}
      </Label>
      <Input
        id={id}
        name={name}
        type="password"
        required
        minLength={minLength}
        autoComplete={autoComplete}
        className="h-11 px-3.5"
        placeholder={placeholder}
        aria-describedby={`${requirementsId} ${strengthId}`}
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />

      <div
        id={strengthId}
        aria-live="polite"
        className={cn(
          "flex items-center gap-2 text-xs transition-opacity",
          hasInput ? "opacity-100" : "opacity-0"
        )}
      >
        <span className="flex gap-1" aria-hidden>
          {[0, 1, 2].map((segment) => (
            <span
              key={segment}
              className={cn(
                "h-1 w-8 rounded-full transition-colors",
                strengthMeta && segment < strengthMeta.filled
                  ? strengthMeta.color
                  : "bg-white/12"
              )}
            />
          ))}
        </span>
        {strengthMeta ? (
          <span className={strengthMeta.text}>
            {PASSWORD_FIELD_COPY.strengthLabel[locale]}:{" "}
            {PASSWORD_FIELD_COPY[strengthMeta.labelKey][locale]}
          </span>
        ) : null}
      </div>

      <div id={requirementsId} className="space-y-1.5 text-xs text-white/58">
        <p>{PASSWORD_FIELD_COPY.requirementsTitle[locale]}</p>
        <ul className="space-y-1">
          {rules.map((rule) => (
            <li key={rule.key} className="flex items-start gap-2">
              <span
                className={cn(
                  "mt-[0.15rem] flex size-3.5 shrink-0 items-center justify-center rounded-full border transition-colors",
                  rule.met
                    ? "border-[#32D583] bg-[#32D583]/16 text-[#6CE9A6]"
                    : "border-white/20 text-transparent"
                )}
              >
                <Check className="size-2.5" aria-hidden />
              </span>
              <span className={cn(rule.met && "text-white/76")}>
                {rule.text}
                <span className="sr-only">
                  {" — "}
                  {rule.met
                    ? PASSWORD_FIELD_COPY.ruleMet[locale]
                    : PASSWORD_FIELD_COPY.ruleUnmet[locale]}
                </span>
              </span>
            </li>
          ))}
        </ul>
        <p className="text-white/44">{PASSWORD_FIELD_COPY.passphraseTip[locale]}</p>
      </div>
    </div>
  )
}
