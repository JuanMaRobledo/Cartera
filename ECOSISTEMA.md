# Ecosistema JMR

La portada de **Cartera** funciona como entrada única al ecosistema financiero.
Las aplicaciones permanecen en repositorios separados porque usan tecnologías,
datos y despliegues distintos; así se evita una migración riesgosa sin volver a
dispersar la experiencia del usuario.

## Repositorios principales

| Producto | Repositorio canónico | Despliegue |
|---|---|---|
| Centro financiero y seguimiento de cartera | [`Cartera`](https://github.com/JuanMaRobledo/Cartera) | Vercel |
| Valoración y análisis fundamental | [`Modelo-JMR`](https://github.com/JuanMaRobledo/Modelo-JMR) | GitHub Pages |
| Presupuesto personal | [`presupuesto-app-web`](https://github.com/JuanMaRobledo/presupuesto-app-web) | GitHub Pages |

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
