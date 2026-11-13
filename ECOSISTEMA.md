# Ecosistema JMR

La portada de **Cartera** funciona como entrada única al ecosistema financiero.
Las aplicaciones permanecen en repositorios separados porque usan tecnologías,
datos y despliegues distintos; así se evita una migración riesgosa sin volver a
dispersar la experiencia del usuario.

## Navegación acordada (13 de noviembre de 2026)

El Centro Financiero tiene accesos directos a **Cartera**, **Modelo JMR Floyd**,
**Modelo JMR V2.0** y **Bitácora de terceros**. Se conserva **Presupuesto**
como quinta herramienta existente.

- Floyd conserva su expediente y motor históricos.
- V2 abre su propia página y cataloga dos visores: **Pendientes de mi auditoría**
  y **Auditadas y aprobadas por mí**. Solo una aprobación explícita del propietario
  mueve una empresa al segundo visor; las pruebas técnicas nunca la aprueban automáticamente.
- Bitácora de terceros abre directamente su página, sin mezclarse con el catálogo V2.
- **Fase actual**: separación de navegación a través del SSO existente de Modelo JMR.
  **No son todavía repositorios ni proyectos Vercel independientes**. La migración
  de V2 y Bitácora necesita proyectos y flujos de autenticación propios.
- Los cambios a Cartera y Modelo JMR se proponen mediante PRs y no deben publicarse
  hasta pasar pruebas y verificar el acceso autenticado en los previews.

## Repositorios principales

| Producto | Repositorio canónico | Despliegue |
|---|---|---|
| Centro financiero y seguimiento de cartera | [`Cartera`](https://github.com/JuanMaRobledo/Cartera) | Vercel |
| Valoración y análisis fundamental | [`Modelo-JMR`](https://modelo-jmr.vercel.app) | Vercel protegido |
| Presupuesto personal | [`presupuesto-app-web`](https://github.com/JuanMaRobledo/presupuesto-app-web) | Vercel protegido |

## Repositorios de apoyo

| Repositorio | Estado recomendado | Motivo |
|---|---|---|
| `Modelo-JMR-datos` | Mantener activo y privado | Base de datos JSON usada por Modelo JMR. No es una aplicación. |
| `presupuesto-app` | Mantener mientras siga desplegado Streamlit | Fuente de la versión original enlazada desde Presupuesto personal. |
| `JMR-valuation` | Revisar antes de archivar | Laboratorio Python de valoración; no forma parte de las tres aplicaciones publicadas. |
| `Modelo-JMR-desarrollo` | Archivar | Antecesor cuyo contenido útil ya vive en `Modelo-JMR`. |
| `Modelo-Damodaran-Robledo` | Eliminar o archivar | Repositorio vacío. |

## Convenciones

- La portada y marca compartida se llaman **JMR · Centro financiero**.
- Cada aplicación muestra el bloque `JMR` con enlace de regreso al centro.
- El sistema visual común usa fondo `slate`, navegación oscura, superficies
  blancas y acento índigo; verde y rojo quedan reservados para estados.
- Los repositorios principales deben usar `main` como rama predeterminada y
  enlazar el centro financiero en su descripción y README.
- Los repositorios históricos deben archivarse, no duplicarse ni seguir
  recibiendo cambios.
