# Registro de Core Web Vitals — SEO-E31

Una fila por corrida, escrita por `scripts/psi-log.mjs` desde
`.github/workflows/cwv-log.yml` (lunes, semanal). **No se edita a mano.**

Cada celda es una URL, medida en **mobile** por la API de PageSpeed Insights:

- **Laboratorio** (Lighthouse en los servidores de Google, una corrida):
  LCP · CLS · TBT · puntaje de rendimiento sobre 100. Una sola corrida varía;
  mirá la tendencia de varias filas, no una.
- **Campo** (Chrome UX Report, usuarios reales, percentil 75 de 28 días):
  LCP · INP · CLS. «sin datos de campo» quiere decir que Chrome no tiene
  tráfico suficiente de esa URL ni del origen; «(origen)» quiere decir que el
  dato es del sitio entero, no de esa página.
- **error** es la respuesta de la API para esa URL, tal cual. No hay números
  inventados: lo que la API no devolvió, la celda no lo tiene.

| Fecha (UTC) | Lighthouse | `/` | `/es` | `/pricing` | `/es/blog/antes-de-tocar-no-despues` | `/tools/energy-curve` | `/es/herramientas/curva-de-energia` |
|---|---|---|---|---|---|---|---|
