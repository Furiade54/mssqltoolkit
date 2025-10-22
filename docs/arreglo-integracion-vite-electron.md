# Explicación detallada del arreglo de integración Vite + Electron

Este documento describe en detalle los problemas detectados, la solución aplicada y cómo operar el proyecto para que funcione correctamente en desarrollo y producción.

## Contexto y síntoma
- Al ejecutar solo `npm run electron`, la app intentaba cargar `http://localhost:5173/` (servidor de desarrollo de Vite) cuando éste aún no estaba corriendo, produciendo `ERR_CONNECTION_REFUSED` o ventana en blanco.
- En algunos entornos de preview aparece el aviso de Vite HMR: "failed to connect to websocket". Este mensaje no afecta el funcionamiento de la app real.

## Objetivo del arreglo
- Asegurar que en desarrollo Electron **espere** a que Vite esté disponible antes de cargar la UI.
- Garantizar que el build de producción funcione correctamente al cargar `file://.../dist/index.html` dentro de Electron.

## Cambios aplicados

### 1) Configuración de Vite (`vite.config.ts`)
Se actualizó la configuración para asegurar rutas relativas en producción y un puerto fijo en desarrollo:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  server: {
    host: "localhost",
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
  },
});
```

- `base: './'`: obliga rutas relativas en el bundle, compatibles con `file://` cuando Electron carga `dist/index.html` en producción.
- `port: 5173` + `strictPort: true`: fija el puerto de desarrollo y evita reasignaciones silenciosas que desalineen a Electron.

### 2) Proceso principal de Electron (`electron-main.cjs`)
Se añadió una espera activa al servidor de Vite antes de cargar la URL y se convirtió `createWindow` en `async`:

```js
const http = require("http");
const https = require("https");

async function waitForUrl(url, timeoutMs = 30000) {
  const start = Date.now();
  const u = new URL(url);
  const client = u.protocol === "https:" ? https : http;
  return await new Promise((resolve, reject) => {
    const attempt = () => {
      const req = client.request(
        { hostname: u.hostname, port: u.port || (u.protocol === "https:" ? 443 : 80), path: "/", method: "GET" },
        (res) => {
          res.resume();
          const ok = (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 500;
          if (ok) resolve(true); else scheduleNext();
        }
      );
      req.on("error", scheduleNext);
      req.end();
    };
    const scheduleNext = () => {
      if (Date.now() - start > timeoutMs) reject(new Error(`Timeout esperando ${url}`));
      else setTimeout(attempt, 500);
    };
    attempt();
  });
}

async function createWindow() {
  // ... BrowserWindow y opciones
  const isDev = !app.isPackaged;
  const devServerURL = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";

  if (isDev) {
    try {
      await waitForUrl(devServerURL, 30000);
    } catch (e) {
      console.warn(`[dev] Vite no está listo aún: ${String(e?.message || e)}`);
    }
    await mainWindow.loadURL(devServerURL);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "dist", "index.html"));
  }
}
```

- `waitForUrl(...)`: intenta conectar repetidamente al host/puerto hasta que responda, evitando que la ventana cargue cuando Vite no está listo.
- `createWindow` ahora es `async` y espera explícitamente a Vite antes de `loadURL`.

### 3) Documentación
Se actualizó la documentación (`docs/chat-summary.md`) y se añadió este documento para detallar el arreglo y el flujo recomendado.

## Cómo arrancar (desarrollo)
- Opción recomendada (un solo comando):
  - `npm run electron:dev`
  - Levanta Vite y Electron en paralelo. Gracias al cambio en `electron-main.cjs`, Electron espera a Vite antes de cargar la UI.
- Opción alternativa (dos terminales):
  - Terminal A: `npm run dev` (Vite)
  - Terminal B: `npm run electron` (Electron)

## Build de producción
- Ejecuta `npm run build` para generar `dist`.
- Gracias a `base: './'` en `vite.config.ts`, las rutas del bundle son relativas y compatibles con `file://`.
- Electron carga `dist/index.html` con `mainWindow.loadFile(...)` correctamente.

## Verificación rápida
- Vite mostrando: `Local: http://localhost:5173/`.
- La ventana de Electron abre con la UI; si estaba en blanco antes de levantar Vite, recarga con `Ctrl+R`.
- No hay `ERR_CONNECTION_REFUSED` al iniciar correctamente.

## Notas
- Los mensajes de DevTools sobre `Autofill.*` son propios de Chrome DevTools y no afectan a la app.
- El aviso de Vite HMR "failed to connect to websocket" puede aparecer en ciertos entornos de preview; no impacta la ejecución normal.

## Por qué funciona
- En desarrollo, Electron espera a que el servidor de Vite esté disponible, por lo que evita cargar una URL no servida.
- En producción, el bundle usa rutas relativas (`base: './'`), que se resuelven correctamente bajo `file://` cuando se carga desde Electron.

## Posibles mejoras futuras
- Soportar puertos configurables (p. ej., leer `VITE_PORT` y ajustar `VITE_DEV_SERVER_URL`).
- Añadir un IPC para "Reload" y otras acciones del menú que faciliten ciclos de desarrollo.
- Manejar reconexión al HMR si se reinicia Vite durante la sesión.