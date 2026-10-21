# Vulnerabilidades de dependencias — triage del 20/10/2026

**Lote 20, tarea 9.** Alimenta la fase F7 (`spec-f7-pentest-remediacion.md`):
lo que `npm audit` encuentra no es un pentest, pero es la parte de F7 que se
puede cerrar sin uno.

Cada número de este documento salió de un comando el 20/10/2026, sobre la rama
`plans/lote-20`; el comando está al lado. El «antes» es el lockfile de `main`
(`472535c`), que la rama tenía intacto al empezar.

## Revisado el 21/10/2026 (lote 21): sin novedad

`npm audit --json` y `npm audit --omit=dev --json` sobre `plans/lote-21`
(= `786e97b` + el lote, sin cambios de dependencias):

| | 20/10 | 21/10 |
|---|---|---|
| Todo | 26 (0 críticas, 20 altas, 4 moderadas, 2 bajas) | **26 (0 críticas, 20 altas, 4 moderadas, 2 bajas)** |
| Sólo producción | 0 | **0** |

**Ninguna de las 20 altas tiene parche publicado.** Lo que `npm audit` ofrece
como arreglo son versiones *viejas* con cambio de major (`@lhci/cli` 0.1.0,
`eslint-config-next` 14.2.35, `shadcn` 1.0.0), no parches. Mirado en el
registro el 21/10:

| Cadena | Raíz | ¿Hay versión que la arregle? |
|---|---|---|
| `shadcn` → `fast-glob` → `micromatch` → `braces`; `eslint-config-next` → `@next/eslint-plugin-next` → `fast-glob` → … → `braces` | `braces` ≤ 3.0.3 (GHSA-vfj7-8cjw-p6xm, agotamiento de pila) | **No.** La última de `braces` es 3.0.3, la vulnerable. `eslint-config-next` 16.4.2 (publicada el 20/10) sigue trayendo `fast-glob` 3.3.1 |
| `shadcn` → `ts-morph` 26 → `@ts-morph/common` 0.27 | `fast-glob` (la misma) | No: `shadcn` 4.22.1 ya es la última y fija `ts-morph` 26 |
| `@lhci/cli` → `lighthouse`, `puppeteer-core`, `proxy-agent`, `tmp`, `basic-ftp`… | varias | No: `@lhci/cli` 0.15.1 ya es la última (publicada en junio de 2025) |

Las tres son herramientas de desarrollo y ninguna está en un trace del build:
nada de esto se despliega. Próxima revisión: la que haga falta cuando
`braces` o `@lhci/cli` publiquen versión — no antes.

## El resultado, en una tabla

| Paso | Todo (`npm audit`) | Sólo producción (`npm audit --omit=dev`) |
|---|---|---|
| Antes (`main`, `472535c`) | **48**: 1 crítica · 31 altas · 12 moderadas · 4 bajas | **27**: 1 crítica · 16 altas · 8 moderadas · 2 bajas |
| 1 · `npm audit fix`, sin `--force` | **26**: 0 críticas · 20 altas · 4 moderadas · 2 bajas | **7**: 0 críticas · 7 altas |
| 2 · `shadcn` a `devDependencies` | **26**: igual | **0** |

El traspaso del lote 19 decía 47 y 30 altas el 10/10. La diferencia es un aviso
publicado después, no un cambio del repo: el lockfile de `main` es el mismo.

Los dos pasos son de naturaleza distinta y conviene no sumarlos: **el paso 1
arregla** (versiones parcheadas instaladas), **el paso 2 reclasifica** (el árbol
de `shadcn` sigue instalado en la máquina que compila; deja de figurar como
producción porque no llega a producción, y abajo está la prueba).

## Paso 1 — lo que se arregló

`npm audit fix` sin `--force` cambia sólo versiones dentro de los rangos que
`package.json` ya declaraba. Contra el lockfile de `main` cambiaron 156 entradas:
104 de versión, 11 nuevas y 41 que ya no se instalan. Las que importan:

| Paquete | Antes → después | Por qué importa |
|---|---|---|
| `proxy-addr` | 2.0.7 → **2.0.8** | **La crítica** (suplantación de IP con IPv6 mapeado a IPv4). Llegaba por `express`, vía `@lhci/cli` y vía `shadcn` |
| `sharp` | 0.35.4 → **0.35.5** | **El único de la lista que corre en producción**: está en los traces de las funciones (optimización de imágenes de Next). Aviso de `librsvg` |
| `ws` | 8.20.0 → 8.22.0 | Vía `@supabase/realtime-js` |
| `@modelcontextprotocol/sdk` | 1.29.0 → 1.32.1 | Vía `shadcn`; arrastraba `hono`, `fast-uri`, `ip-address`, `express` |
| `hono` | 4.12.12 → 4.13.13 | Ídem |
| `source-map-js`, `postcss` | 1.2.1 → 1.2.2, 8.5.28 → 8.5.31 | Toolchain de CSS |
| `shadcn` | 4.2.0 → **4.22.1** | Directa. Su `tailwind.css` entra en el CSS global: ver abajo |
| `music-metadata` | 11.13.0 → **11.16.1** | Directa. Lee los tags en la importación de audio local, **en el navegador** |

**Las dos directas, revisadas antes de aceptarlas:**

- `shadcn/tailwind.css`: las primeras 95 líneas son idénticas entre 4.2.0 y
  4.22.1, y lo nuevo son utilidades (`scroll-fade-*`, `shimmer`) que Tailwind
  emite sólo si una clase las usa. **El repo no usa ninguna** (`grep -rnE
  '\bshimmer|scroll-fade'` sobre `app`, `components`, `lib` y `content`: 0).
- `music-metadata` sigue siendo **MIT**. La regla dura de `AGENTS.md` (nada GPL
  ni AGPL que llegue al cliente) se revisó sobre las 115 entradas que el
  lockfile nuevo instala con otra versión o por primera vez: MIT (76),
  Apache-2.0 (17), ISC, BSD, MPL-2.0 o Apache, CC-BY-4.0 (los datos de
  `caniuse-lite`), y LGPL sólo en los 14 binarios de
  `libvips` de `sharp`, que ya estaban (S-09 del registro) y no llegan al
  navegador.

## Paso 2 — `shadcn` no es una dependencia de producción

Lo único que el sitio usa de `shadcn` es una línea de `app/globals.css`:
`@import "shadcn/tailwind.css"`. Ese import lo resuelve `@tailwindcss/postcss`
**al compilar**, igual que `tailwindcss`, y los dos ya estaban en
`devDependencies`: el build ya dependía de que se instalen. El CLI de `shadcn`
—con `ts-morph`, el SDK de MCP, `express`, `fast-glob`— no se importa en ningún
lado.

**La prueba, sobre el build de `main` del 20/10** (101 archivos `.nft.json`, que
son lo que Vercel empaqueta en cada función):

| Paquete | ¿En algún trace? | ¿En el código compilado (`.next/server` + `.next/static`)? |
|---|---|---|
| `shadcn`, `@shadcn/registry`, `ts-morph` | No | No |
| `proxy-addr`, `express` | No | No |
| `@modelcontextprotocol/sdk`, `hono` | No | No |
| `braces`, `micromatch`, `fast-glob` | No | No |
| `@lhci/cli` | No | No |
| `sharp` | **Sí** | — (binario) |

La segunda columna importa porque un trace no muestra lo que el bundler metió
adentro de un chunk; se buscó el nombre de cada paquete en el JS compilado.
`tests/dependency-classification.test.ts` deja escrito que `shadcn` sólo se
usa desde CSS: si alguien lo importa desde código, el test falla y la
clasificación hay que revisarla.

## Lo que queda: 20 altas, todas de desarrollo

| Raíz (dependencia de desarrollo) | Paquetes con aviso | El aviso de fondo | Por qué no se arregla acá |
|---|---|---|---|
| `@lhci/cli` 0.15.1 (Lighthouse CI) | `@lhci/utils`, `lighthouse`, `puppeteer-core`, `@puppeteer/browsers`, `extract-zip`, `tmp`, `basic-ftp`, `get-uri`, `pac-proxy-agent`, `proxy-agent` (11 con la raíz) | `tmp` (GHSA-52f5-9888-hmc6, GHSA-ph9p-34f9-6g65), `extract-zip` (GHSA-jmr9-qjv8-65gv, GHSA-7pqw-9j4j-h8q3), `basic-ftp` (GHSA-c475-qrg2-pj4r) | 0.15.1 es la última publicada (`npm view @lhci/cli version`). Lo que npm ofrece es bajar a 0.1.0. Corre sólo en la máquina de quien mide Lighthouse, contra URLs propias |
| `eslint-config-next` 16.2.3 | `@next/eslint-plugin-next`, `fast-glob`, `micromatch`, `braces` (5 con la raíz) | `braces` GHSA-vfj7-8cjw-p6xm | `braces` **no tiene versión parcheada** (rango `*`). Subir a 16.3.8 no cambia la cadena. Es exactamente lo que StageLink resolvió ignorando el aviso en su #849 |
| `shadcn` 4.22.1 | `@shadcn/registry`, `ts-morph`, `@ts-morph/common`, y los mismos `fast-glob` → `micromatch` → `braces` (4 propios) | `braces` | Ídem: sin parche. Lo que npm ofrece es bajar `shadcn` a 1.0.0 |

Las veinte, contadas paquete por paquete con
`npm audit --json` → `vulnerabilities[*].severity == "high"`; tres raíces.
Ninguna corre en producción ni en el navegador.

**No se agregó ningún `override` ni ningún «ignore».** El CI corre
`npm audit --audit-level=high` como advisory (S-10 del registro), así que estas
veinte no bloquean nada hoy. Si algún día se vuelve bloqueante, el criterio es
el de StageLink #849: ignorar sólo un aviso **sin parche y sólo de desarrollo**,
con el GHSA nombrado.

## Para F7

- **La crítica de `proxy-addr` ya no está**, en ninguna de las dos vistas.
- **Producción: 0 vulnerabilidades conocidas** según `npm audit --omit=dev`,
  con la clasificación probada contra los traces.
- Lo que **no** dice este documento: que no haya vulnerabilidades en el código
  propio, ni en dependencias sin aviso publicado. Eso es lo que un pentest
  mira y `npm audit` no.
- **Implementado, no desplegado.** Hasta que Robertino mergee y Vercel
  despliegue, producción corre el lockfile de `main`, con `sharp` 0.35.4.
