# Changelog

All notable changes to this project will be documented in this file.

## v0.0.11 — Mejoras en RegisterModal y flujo de registro

- Added / Changed
  - RegisterModal: impedir cierre por clic fuera y bloqueo de `Escape`.
  - Mensaje de éxito tras registrar y cierre automático a los 4s.
  - Limpieza de campos y mensajes al cerrar y al reabrir el modal.
  - Selector de servidor como primer campo, con carga desde `getMSSQLServers` y validación.
- Fixed
  - Correcciones de TypeScript y eliminación de marcadores de diff en `RegisterModal.tsx`.
- Release
  - Bump de versión a `v0.0.11` y creación de `docs/release-v0.0.11.md`.

## Unreleased — Cambio de base a mssqltoolkit

- Changed
  - Base MSSQL por defecto cambia de `Opciones` a `mssqltoolkit`.
  - IPCs `mssql:validateUser`, `mssql:runQuery` y `mssql:saveConsulta` actualizados para usar `database: "mssqltoolkit"`.
  - Consultas apuntan a `dbo.GENUsuario` y `dbo.GENConsultas` sin prefijar el nombre de la base en el SQL.
- Docs
  - Actualizado `docs/chat-summary.md` para reflejar el cambio de base.
- Notes
  - Requiere existencia de la base `mssqltoolkit` y tablas `dbo.GENUsuario` y `dbo.GENConsultas`.

## v0.0.10 — Instalación con UAC al actualizar

- Changed
  - `quitAndInstall` ahora invoca el instalador en modo no silencioso (`isSilent: false`) para solicitar elevación UAC cuando corresponda.
  - Flujo de actualización ajustado en `MenuBar` para pasar opciones explícitas.

- Tech
  - IPC principal `autoUpdate:quitAndInstall` acepta opciones `{ isSilent, isForceRunAfter }`.
  - `preload.cjs` reenvía opciones y `global.d.ts` actualiza tipos.

- Release
  - Bump de versión a `v0.0.10`.

## v0.0.9 — Botón de actualización y menús en español

- Changed
  - Traducción de opciones del menú de usuario al español.
  - Remoción de “Check for Updates...” del menú de usuario; acciones de actualización centralizadas.
  - Añadido botón CTA de auto-actualización en la barra superior con estados dinámicos.

- Fixed
  - Ajustes menores en `MenuBar.tsx` relacionados con estados y render.

- Release
  - Bump de versión a `v0.0.9`.

## v0.0.3 — Reestructuración de menús y mejoras UI

- Added
  - Menú contextual en el icono de usuario con opciones: Buscar actualizaciones, Documentación, Reportar problema, Contacto y Cerrar sesión.
  - Etiqueta de versión fija en la esquina inferior derecha de la ventana (solo en Electron), obtenida desde `getMeta()` del proceso principal.

- Changed
  - Reestructuración de `MenuBar`: menús en español y acordes al flujo actual (Archivo, Vista, Ayuda).
  - Vista: acciones de Recargar, Herramientas de desarrollo y Pantalla completa.
  - Ayuda: Documentación, Reportar problema, Buscar/Instalar actualización, Acerca de.
  - Archivo: Cerrar sesión y Salir.
  - `App.tsx`: conexión de `onLogout` para volver al login.
  - Obtención de versión del aplicativo usando `getMeta()` en lugar de `getVersion()` para evitar mostrar la versión de Electron.

- Fixed
  - Correcciones de sintaxis en comentarios JSX en `App.tsx` que causaban errores de compilación.

- Release
  - Merge de `feature/updater-ux` a `main`.
  - Bump de versión a `v0.0.3`.

## v0.0.2 — Versión inicial

- Configuración base de Vite + Electron.
- Componentes iniciales para tarjetas y login.