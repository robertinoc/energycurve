# Despliegue y rollback

Fase F6 del *Plan Integral de Pruebas*. Escrito el 11/09/2026.

---

## El hallazgo que da origen a este documento

**Vercel despliega en cada push a `main` sin esperar al CI.**

Los dos corren en paralelo, no en serie. O sea que un merge con los tests en rojo
igual llega a producción, y lo que decide si algo se publica no es el gate: es
cuál de los dos procesos terminó primero.

No es teórico. El CI de este repo tarda entre cuatro y seis minutos, la mayor
parte en el E2E de cuatro navegadores. Un build de Vercel tarda dos. **Producción
gana casi siempre.**

Los cinco gates son excelentes y no sirven para lo único que un gate tiene que
hacer, que es impedir.

### Cómo se arregla, y por qué no lo hice yo

Vercel tiene "Ignored Build Step": un comando que, si sale con código 0, cancela
el deploy. Combinado con la API de GitHub se puede hacer que espere al CI.

No lo configuré porque **es el panel de Vercel y afecta cada deploy del
proyecto**. Si queda mal, el síntoma es que no se puede publicar nada y no es
obvio por qué. Es tuyo.

Las dos formas, de menos a más estricta:

1. **Proteger la rama.** En GitHub: Settings → Branches → regla para `main` con
   "Require status checks to pass" y el check `verify`. Eso no permite mergear un
   PR en rojo, que es el 95% del riesgo, y no toca Vercel. **Es la que
   recomiendo.**
2. **Ignored Build Step en Vercel**, si además querés cubrir un push directo a
   `main`. Más completo y con más superficie para romperse.

Con la opción 1, el CI pasa de "informa" a "impide" sin tocar el despliegue.

---

## Desplegar

No hay nada que hacer. Vercel despliega en cada push a `main`.

Lo único que **no** es automático son las migraciones de base de datos: se corren
a mano en el SQL Editor de Supabase, y el orden importa. Si un cambio trae una
migración, **corrila antes de mergear**, no después.

Ese orden no es una preferencia. En agosto se mergearon dos features cuyas
migraciones nunca se corrieron: cada llamada fallaba, el error se tragaba en la
capa de servicio, y en la UI se veía como un botón que simplemente no confirmaba
nunca. Indistinguible de un click que no registró.

Verificación después de cada deploy, en treinta segundos:

```bash
curl -s https://energycurve.app/api/health
```

Tiene que decir `{"status":"ok","database":"ok","auth":"configured",...}`. Si
`database` dice otra cosa, el deploy salió pero el producto no funciona.

---

## Rollback

### Decidir en un minuto

| Síntoma | Qué hacer |
|---|---|
| Producción caída o rota para todos | **Rollback ya.** Diagnosticar después |
| Una feature rota, el resto anda | Rollback si toca pagos, auth o export; si no, fix hacia adelante |
| Datos mal calculados pero se muestran | Rollback: cada minuto que pasa son más análisis con números equivocados |
| Datos siendo destruidos | **Rollback ya**, y después medir el daño. Es el único caso donde la demora es irreversible |
| Lento pero funciona | No hacer rollback. Investigar |

La regla que ordena la tabla: hacer rollback de algo que se podía arreglar cuesta
diez minutos. No hacerlo de algo que destruye datos cuesta datos de otra persona,
y no se recupera.

### Cómo

**Por el panel**, que es lo más rápido: Vercel → Deployments → el último que
andaba → "Promote to Production". Tarda segundos porque el build ya existe.

**Por consola**, si preferís:

```bash
vercel rollback
```

**Verificar siempre después**, porque un rollback que no se verifica es una
suposición:

```bash
curl -s https://energycurve.app/api/health
```

### Lo que un rollback NO deshace

Esto es lo importante y es lo que suele sorprender.

- **Las migraciones de base de datos.** El código vuelve atrás; el esquema no. Si
  la versión rota agregó una columna, el código viejo la ignora y todo bien. Si
  **borró o renombró** algo, el código viejo se rompe distinto. Por eso las
  migraciones se escriben aditivas.
- **Los webhooks de Stripe ya procesados.** Los planes otorgados siguen
  otorgados. `billing_events` los tiene registrados.
- **Los mails ya enviados.**
- **Los archivos que la gente ya exportó.** Un export defectuoso ya escribió
  sobre la librería de alguien. El rollback protege a los próximos, no a los que
  ya lo corrieron. Es exactamente la forma del bug P0 del 07/09, y la razón por
  la que ese riesgo tiene siete tests.

---

## Cuando el problema no es el código

**Supabase pausado.** El plan gratuito pausa el proyecto tras ~7 días sin
actividad, y ya tiró producción abajo una vez, el 28/07/2026. Por eso existe
`.github/workflows/keep-supabase-alive.yml`, que le pega a `/api/health` los
lunes y jueves. Si igual pasa: despausar desde el panel de Supabase; no hay nada
que desplegar.

**El proveedor de IA caído.** No hace falta hacer nada: el ordenamiento
inteligente cae al heurístico y el producto sigue funcionando. Eso es por diseño.
Pero ojo con el lado oscuro de ese diseño: **el fallback funciona tan bien que
nadie se entera de que el camino bueno está roto.** Estuvo semanas así.

**Una credencial comprometida.** Eso no es un rollback: es
`docs/security/incident-response.md`.

---

## Lo que hoy no se puede hacer, y hay que saberlo

- **No hay backups documentados ni restauración probada.** Un incidente de
  integridad — datos alterados, no perdidos — no tiene procedimiento hoy.
  Confirmá si el plan de Supabase incluye PITR.
- **No hay alertas.** Nadie se entera de que producción está rota salvo que mire
  o que un usuario escriba. El monitor de uptime cubre solo que el sitio
  responda.
- **No hay entorno de staging.** Lo que se prueba antes de producción son los
  deploys de preview de Vercel, y esos usan las variables de Preview.
