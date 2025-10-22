# Changelog

All notable changes to this project will be documented in this file.

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