# Resumen del contexto del chat

Este documento resume los cambios, decisiones técnicas y flujos de uso implementados durante la sesión para la app Electron + React con soporte de conexión a SQL Server (MSSQL).

## Objetivo
- Probar conectividad a MSSQL, validar credenciales de usuario contra la base `Opciones`, y gestionar múltiples servidores MSSQL (crear, editar, eliminar y seleccionar) desde la UI.
- Mejorar el soporte de depuración (DevTools) y exponer las capacidades al renderer con tipos actualizados.

## Cambios principales
- Dependencia `mssql` instalada y usada desde el proceso `main` de Electron.
- Handler IPC `mssql:testConnection` para probar conexión (deshabilita TLS por defecto, confía en certificado del servidor).
- Handler IPC `mssql:validateUser` para validar credenciales usando `Opciones.dbo.GENUsuario` con parámetros `@codigo` y `@clave`.
- Persitencia de servidores MSSQL en `servers.json` (ruta `app.getPath("userData")`).
- IPCs para CRUD de servidores: `mssql:getServers`, `mssql:saveServer`, `mssql:updateServer`, `mssql:deleteServer`.
- Exposición en `preload.cjs` de las APIs de aplicación, MSSQL y utilidades de ventana.
- UI:
  - `AddServerModal`: formulario de servidor, dropdown para seleccionar servidor guardado, acciones Nuevo/Eliminar, botón único "Editar/Guardar", y “Test conexión”.
  - `LoginForm`: selector de servidor, botón único “AddServer”, validación de usuario MSSQL al pulsar “Ingresar”, mensajes de error.
- Toggle de DevTools integrado (main + preload + `MenuBar.tsx`).

## Detalles de conexión MSSQL
- Configuración por defecto en pruebas de conexión y validación:
  - `options.encrypt: false` (TLS deshabilitado por defecto en redes locales).
  - `options.trustServerCertificate: true` para evitar errores por certificados no confiables.
  - `connectionTimeout: 7000` y `requestTimeout: 7000` ms.
  - Puerto manejado numéricamente (por defecto `1433` si no especificado).
- Se eliminó la configuración explícita de `cryptoCredentialsDetails` (negociación TLS delegada al driver `mssql`).

## IPCs disponibles (proceso main)
- App/ventana:
  - `app:exit` (event), `window:minimize` (event), `window:maximize-toggle` (event), `window:close` (event), `window:devtools-toggle` (event).
  - `app:getVersion` (handle), `app:getMeta` (handle).
- MSSQL servidores (persistencia):
  - `mssql:getServers` → lista de servidores guardados.
  - `mssql:saveServer` → crea un nuevo servidor.
  - `mssql:updateServer` → actualiza un servidor existente por índice.
  - `mssql:deleteServer` → elimina un servidor por índice.
- MSSQL utilidades:
  - `mssql:testConnection` → prueba de conectividad con IP/puerto/usuario/contraseña.
  - `mssql:validateUser` → valida `username`/`password` en `Opciones.dbo.GENUsuario` (acepta `serverIndex` y `encrypt`).

## API expuesta al renderer (preload)
- App/ventana: `exit`, `minimize`, `maximizeToggle`, `close`, `toggleDevTools`, `getVersion`, `getMeta`.
- MSSQL servidores: `getMSSQLServers`, `saveMSSQLServer`, `updateMSSQLServer`, `deleteMSSQLServer`.
- MSSQL utilidades: `testMSSQLConnection`, `validateMSSQLUser`.
- Tipos actualizados en `src/global.d.ts` para todas las APIs expuestas.

## Cambios en UI
- `src/components/AddServerModal.tsx`
  - Campos: `name`, `ip`, `port`, `user`, `password`.
  - Dropdown de “Servidores guardados” con botones: “Nuevo” y “Eliminar”.
  - Botón único “Editar/Guardar”: en vista inicial los inputs están deshabilitados; al pulsar “Editar” se habilitan, y el mismo botón cambia a “Guardar”. Si hay un servidor seleccionado, guarda cambios (actualiza) y vuelve a modo lectura; si no hay selección, crea un nuevo servidor (mantiene el comportamiento de cerrar el modal al guardar nuevo).
  - Botón “Test conexión” que usa `testMSSQLConnection`.
  - Carga/recarga de lista al abrir y tras operaciones.
- `src/components/LoginForm.tsx`
  - Selector de servidor (usa `getMSSQLServers`).
  - Botón “AddServer” abre el modal; al cerrar, el login refresca la lista.
  - Submit “Ingresar” llama `validateMSSQLUser` pasando `serverIndex` del selector y muestra feedback de error.
  - Validación local: usuario ≥ 3 caracteres; contraseña ≥ 4 (para permitir valores como `8978`).
  - Se eliminó el botón “AddServer” duplicado, dejando solo el del selector.
- `src/components/MenuBar.tsx`
  - Conecta “Toggle Developer Tools” a `toggleDevTools`.

## Cómo usar
1) Agregar servidor
   - En el login, pulsa “AddServer”.
   - En el modal, completa `IP/port/user/password` y opcionalmente `name`.
   - “Test conexión” para verificar conectividad.
   - Usa el botón “Editar/Guardar”: si no hay servidor seleccionado, al entrar en edición podrás completar y luego “Guardar” creará el nuevo; si hay un servidor seleccionado, “Editar” habilita inputs y “Guardar” actualizará la configuración. “Eliminar” borra el seleccionado; “Nuevo” limpia el formulario y habilita edición.
2) Seleccionar servidor y validar usuario
   - En el login, elige el servidor del dropdown.
   - Ingresa `Usuario` y `Contraseña` (p. ej., `jpaez` / `8978`).
   - Pulsa “Ingresar” para validar contra `Opciones.dbo.GENUsuario`.
3) Depurar
   - Usa el menú “Toggle Developer Tools” para ver logs del renderer.
   - Revisa la consola de `electron-main` para logs de IPC (`mssql:...`).

## Observaciones
- El aviso de Vite HMR “failed to connect to websocket” es esperado en este entorno y no afecta la funcionalidad.
- TLS: por defecto `encrypt: false` y `trustServerCertificate: true`. Si se necesita TLS, habilitar `encrypt` explícitamente al invocar.

## Integración Vite + Electron
- Desarrollo: usa `npm run electron:dev` para arrancar Vite (`http://localhost:5173`) y Electron en paralelo. Electron ahora espera a que Vite esté disponible antes de cargar la URL, evitando `ERR_CONNECTION_REFUSED`.
- Producción: `npm run build` genera `dist` con `base: './'`, lo que asegura rutas relativas compatibles con `file://`. Electron carga `dist/index.html` correctamente.
- Scripts: `npm run electron` asume que Vite ya está corriendo en `5173`. Alternativamente, ejecuta `npm run dev` y `npm run electron` en terminales separadas.
- Puertos: Vite está configurado con `port: 5173` y `strictPort: true`. Si el puerto está ocupado, liberarlo o ajustar `vite.config.ts`.

## Próximos pasos sugeridos
- Añadir validaciones UX en el modal (requeridos, rango de puerto, feedback tras actualizar/eliminar).
- Permitir reordenar servidores por prioridad o marcar uno como predeterminado.
- Opción de prueba de conexión rápida junto al selector del login.
- Soporte de instancias con nombre (`SERVER\\INSTANCIA`) o autenticación integrada de Windows cuando aplique.