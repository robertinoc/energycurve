"use client"

import { useState } from "react"
import { ArrowRight, Loader2 } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

interface LandingContactFormCopy {
  title: string
  description: string
  form: {
    name: string
    email: string
    message: string
    submit: string
  }
  status: {
    sending: string
    genericError: string
  }
  locale: "en" | "es"
}

interface FieldErrors {
  name?: string[]
  email?: string[]
  message?: string[]
}

export function LandingContactForm({
  copy,
}: {
  copy: LandingContactFormCopy
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  )
  const [message, setMessage] = useState("")
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (status === "loading") {
      return
    }

    setStatus("loading")
    setMessage("")
    setFieldErrors({})

    const form = event.currentTarget
    const formData = new FormData(form)
    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      message: String(formData.get("message") ?? ""),
      company: String(formData.get("company") ?? ""),
      locale: copy.locale,
    }

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      const data = (await response.json()) as
        | { ok: true; message: string }
        | { ok: false; message: string; fieldErrors?: FieldErrors }

      if (!response.ok || !data.ok) {
        setStatus("error")
        setMessage(data.message)
        setFieldErrors("fieldErrors" in data ? data.fieldErrors ?? {} : {})
        return
      }

      form.reset()
      setStatus("success")
      setMessage(data.message)
    } catch {
      setStatus("error")
      setMessage(copy.status.genericError)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid gap-4 md:grid-cols-2">
        <Field
          id="contact-name"
          name="name"
          label={copy.form.name}
          error={fieldErrors.name?.[0]}
        />
        <Field
          id="contact-email"
          name="email"
          label={copy.form.email}
          type="email"
          error={fieldErrors.email?.[0]}
        />
      </div>

      <Field
        id="contact-message"
        name="message"
        label={copy.form.message}
        error={fieldErrors.message?.[0]}
        multiline
      />

      <div className="sr-only" aria-hidden="true">
        <Label htmlFor="contact-company">Company</Label>
        <Input
          id="contact-company"
          name="company"
          autoComplete="off"
          tabIndex={-1}
        />
      </div>

      <button
        type="submit"
        disabled={status === "loading"}
        className={cn(
          buttonVariants({ size: "lg" }),
          "w-full justify-between ec-gradient-bg text-white shadow-[0_8px_24px_rgba(120,60,220,0.35)]"
        )}
      >
        {status === "loading" ? (
          <>
            {copy.status.sending}
            <Loader2 className="size-4 animate-spin" />
          </>
        ) : (
          <>
            {copy.form.submit}
            <ArrowRight className="size-4" />
          </>
        )}
      </button>

      <div aria-live="polite" aria-atomic="true">
        {status === "success" ? (
          <p className="text-sm text-ec-cyan">{message}</p>
        ) : null}
        {status === "error" ? (
          <p className="text-sm text-ec-error">{message}</p>
        ) : null}
      </div>
    </form>
  )
}

function Field({
  id,
  name,
  label,
  type = "text",
  error,
  multiline = false,
}: {
  id: string
  name: string
  label: string
  type?: string
  error?: string
  multiline?: boolean
}) {
  const describedBy = error ? `${id}-error` : undefined

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-white/76">
        {label}
      </Label>
      {multiline ? (
        <textarea
          id={id}
          name={name}
          rows={6}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            "w-full rounded-lg border border-input bg-ec-sunken px-4 py-3 text-sm text-ec-text outline-none transition placeholder:text-ec-text-dim focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/15",
            error ? "border-ec-error/50" : ""
          )}
        />
      ) : (
        <Input
          id={id}
          name={name}
          type={type}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={cn(
            "h-12 px-4",
            error ? "border-ec-error/50" : ""
          )}
        />
      )}
      {error ? (
        <p id={describedBy} className="text-sm text-ec-error">
          {error}
        </p>
      ) : null}
    </div>
  )
}
