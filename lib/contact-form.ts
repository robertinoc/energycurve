import { z } from "zod"

import { SiteLocale } from "@/lib/content/site-copy"

const collapsedWhitespace = /\s+/g
const controlCharacters = /[\u0000-\u001f\u007f]/g

function sanitizeText(value: string) {
  return value
    .replace(controlCharacters, " ")
    .replace(/[<>]/g, "")
    .replace(collapsedWhitespace, " ")
    .trim()
}

function getContactValidationMessages(locale: SiteLocale) {
  return locale === "es"
    ? {
        nameRequired: "Por favor ingresá tu nombre.",
        nameLong: "El nombre es demasiado largo.",
        emailInvalid: "Ingresá un email válido.",
        emailLong: "El email es demasiado largo.",
        messageRequired: "Contanos un poco más en tu mensaje.",
        messageLong: "El mensaje es demasiado largo.",
      }
    : {
        nameRequired: "Please enter your name.",
        nameLong: "Name is too long.",
        emailInvalid: "Please enter a valid email address.",
        emailLong: "Email is too long.",
        messageRequired: "Please share a little more detail in your message.",
        messageLong: "Message is too long.",
      }
}

export function createContactFormSchema(locale: SiteLocale) {
  const messages = getContactValidationMessages(locale)

  return z.object({
    name: z
      .string()
      .transform(sanitizeText)
      .pipe(z.string().min(2, messages.nameRequired).max(80, messages.nameLong)),
    email: z
      .string()
      .transform((value) => sanitizeText(value).toLowerCase())
      .pipe(
        z
          .string()
          .email(messages.emailInvalid)
          .max(160, messages.emailLong)
      ),
    message: z
      .string()
      .transform(sanitizeText)
      .pipe(
        z
          .string()
          .min(12, messages.messageRequired)
          .max(2000, messages.messageLong)
      ),
    company: z.string().optional().default(""),
    locale: z.enum(["en", "es"]).default("en"),
  })
}

export type ContactFormInput = z.infer<ReturnType<typeof createContactFormSchema>>
