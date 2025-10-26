# Release v0.0.11

Fecha: 2025-10-26

## Cambios principales

- RegisterModal: impedir cierre por clic fuera del modal.
- RegisterModal: bloquear cierre con tecla `Escape`.
- RegisterModal: mostrar mensaje de éxito y cerrar automáticamente tras 4 segundos.
- RegisterModal: limpiar todos los campos y mensajes al cerrar y al reabrir.
- RegisterModal: mantener y validar el selector de servidor (carga desde `getMSSQLServers`).
- Correcciones de TypeScript en `RegisterModal.tsx` y limpieza de marcadores de diff.
- Ajustes menores en `electron-main.cjs`, `preload.cjs`, `App.tsx`, `LoginForm.tsx`, `src/db.ts` y tipos.

## Notas

- Se probaron los cambios en vista de desarrollo. No se detectaron errores en el navegador; se recomienda revisar el terminal por advertencias de compilación.
- El overlay ya no cierra el modal; la tecla `Escape` también está bloqueada. El botón "Cancelar" cierra y limpia correctamente (cancelando cualquier temporizador activo).

## Publicación

- `package.json` actualizado a `0.0.11`.
- Tag propuesto: `v0.0.11`.
- Artefacto Windows: `MSSQL Tool Kit-0.0.11-Setup.exe` (vía `release:win`).