# UTMs para redes propias — links listos para pegar

La medición ya existe: el first touch (migración 0034) guarda `utm_source` y
`utm_medium` de la primera visita, la lista cerrada de fuentes ya conoce
`instagram`, `linkedin`, `tiktok`, `youtube`, `x` y `threads`
(`lib/attribution/first-touch.ts`), y el backstage agrupa por canal
(`lib/backstage/channels.ts`): Instagram y LinkedIn tienen su propia porción en
el donut y su columna en las cohortes. **Lo único que falta es que los links que
publicás lleven la etiqueta.** Un link sin UTM desde la bio de Instagram llega
como referrer (`l.instagram.com`, que también se reconoce) solo a veces — las
apps nativas suelen comérselo, y entonces esa alta queda en Unknown.

La convención general del sitio está en `docs/seo/utm-convention.md`; esto es
la hoja de "copiar y pegar" para los perfiles y posts.

## Los links

| Dónde va | Link |
|---|---|
| Bio de Instagram | `https://energycurve.app/?utm_source=instagram&utm_medium=social&utm_campaign=bio` |
| Post/reel de Instagram (link en historia) | `https://energycurve.app/?utm_source=instagram&utm_medium=social&utm_campaign=post` |
| Perfil de LinkedIn | `https://energycurve.app/?utm_source=linkedin&utm_medium=social&utm_campaign=bio` |
| Post de LinkedIn | `https://energycurve.app/?utm_source=linkedin&utm_medium=social&utm_campaign=post` |
| Bio de TikTok | `https://energycurve.app/?utm_source=tiktok&utm_medium=social&utm_campaign=bio` |
| Descripción de YouTube | `https://energycurve.app/?utm_source=youtube&utm_medium=social&utm_campaign=video` |
| Bio de X / Threads | `https://energycurve.app/?utm_source=x&utm_medium=social&utm_campaign=bio` |

(La firma de email queda sin etiqueta a propósito: la lista cerrada no tiene una
fuente para eso — `other` existe pero nunca va en un link publicado, y el test
`tests/utm-convention.test.ts` lo rechaza. Si un día importa medirla, agregar
`email` a `KNOWN_SOURCES` es un cambio de código revisado, como manda esa lista.)

Reglas al armar variantes:

1. `utm_source` **solo** de la lista cerrada (`instagram`, `linkedin`, `tiktok`,
   `youtube`, `x`, `threads`, `stagelink`…). Un source inventado se normaliza a
   `other` y se pierde el canal. Los alias `ig`/`li`/`insta` también funcionan,
   pero mejor el nombre completo.
2. `utm_medium=social` para redes; la lista cerrada de mediums está en
   `MEDIUMS` (first-touch.ts).
3. `utm_campaign` es tuyo y libre de formato (se normaliza): usalo para
   distinguir `bio` de `post` de una campaña puntual (`lanzamiento-sets`).
4. El destino puede ser cualquier página propia — una herramienta gratis
   (`/tools/energy-curve?utm_source=instagram&utm_medium=social&utm_campaign=bio`)
   convierte mejor que la home para público DJ, y el backstage ya cruza
   "aterrizó en la herramienta" con "se registró".

## La nota honesta

El first touch solo se guarda para visitantes que **aceptan la analítica** (y
DNT/GPC cuentan como no). O sea: los números por canal son un **piso, no un
censo** — sirven para comparar canales entre sí (la proporción es comparable),
no para contar personas absolutas. El panel lo dice en su header; esta nota
existe para que ningún reporte externo cite esos números como totales.
