# Plantilla de notificación de brecha

Para completar bajo presión, así que está escrita para llenar los huecos y
mandar. Los cuatro puntos son los del Art. 33.3 del GDPR.

**Regla de uso: una notificación incompleta dentro de plazo es mejor que una
completa fuera de plazo.** El Art. 33.4 permite entregar la información por
fases. Mandá lo que sepas antes de las 72 horas y completá después.

---

## A la autoridad de control

**Asunto:** Notificación de violación de seguridad de datos personales — EnergyCurve (StageLink LLC)

**Responsable del tratamiento:** StageLink LLC, operadora de EnergyCurve (energycurve.app)
**Contacto:** hello@energycurve.app
**Fecha y hora en que tomamos conocimiento:** `[AAAA-MM-DD HH:MM UTC]`
**Fecha y hora estimadas de los hechos:** `[AAAA-MM-DD HH:MM UTC, o «no determinada»]`

### 1. Naturaleza de la violación

`[Qué pasó, en dos o tres frases y sin jerga.]`

**Categorías de datos afectados:** `[Tomadas del RoPA: direcciones de mail · metadata de playlists y tracks · local y franja horaria · datos de facturación · …]`

**Categorías de personas afectadas:** usuarios registrados de EnergyCurve.

**Número aproximado de personas afectadas:** `[N]`
**Número aproximado de registros afectados:** `[N]`

> Si todavía no se puede precisar, escribir el rango y decir explícitamente que se
> completará en una comunicación posterior conforme al Art. 33.4.

### 2. Punto de contacto

`[Nombre]` — hello@energycurve.app

> Si hay representante del Art. 27 designado, va acá con su jurisdicción.

### 3. Consecuencias probables

`[Qué le puede pasar a una persona afectada. Ser concreto: «una dirección de mail expuesta puede usarse para phishing dirigido» sirve más que «riesgo para los derechos y libertades».]`

### 4. Medidas adoptadas o propuestas

**Contención, ya hecha:**
- `[Ej.: credencial rotada a las HH:MM UTC]`
- `[Ej.: acceso revocado]`

**Mitigación del daño a las personas:**
- `[Ej.: notificación directa a los afectados]`
- `[Ej.: forzado de reseteo de contraseña]`

**Medidas para que no se repita:**
- `[Ej.: alerta configurada sobre X]`

---

## A las personas afectadas

Solo si el riesgo es **alto** (Art. 34). Sin demora indebida, en lenguaje claro,
y en el idioma de la persona: el producto tiene copy en inglés y en español, y
`profiles.preferred_locale` dice cuál corresponde.

> **Asunto:** Algo pasó con tus datos en EnergyCurve
>
> Hola `[nombre]`,
>
> Te escribimos porque el `[fecha]` detectamos `[qué pasó, en una frase]`.
>
> **Qué datos tuyos están involucrados:** `[lista concreta]`
>
> **Qué NO está involucrado:** `[igual de importante. Ej.: tus archivos de audio nunca salen de tu dispositivo, así que no están. Tus datos de tarjeta los guarda Stripe y no nosotros.]`
>
> **Qué hicimos:** `[contención, con hora]`
>
> **Qué te recomendamos hacer:** `[concreto y accionable, o «nada, no hace falta que hagas nada» si es el caso]`
>
> Si tenés preguntas, respondé este mail y te contesta una persona.
>
> `[Nombre]`
> EnergyCurve — operado por StageLink LLC

**Dos reglas para este mail.** Decir también qué **no** está afectado: es lo
primero que alguien quiere saber y omitirlo hace que asuma lo peor. Y no usar la
voz pasiva para describir lo que hicimos mal.
