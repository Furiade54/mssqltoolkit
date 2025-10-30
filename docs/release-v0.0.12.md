# MSSQL Tool Kit v0.0.12 — Mejora visual en Login

## Cambios

- UI: Panel derecho del login ahora usa imagen de fondo y overlay para mejorar contraste.
- Accesibilidad: Textos del panel se muestran en blanco para mayor legibilidad.

## Técnicos

- `artifactName` ya usa formato con guiones; el script `release-win-gh.ps1` se alinea para generar `latest.yml` con nombres guionados.
- Bump de versión a `v0.0.12`.

## Publicación

- Generar instalador Windows y `latest.yml` usando los scripts de npm.