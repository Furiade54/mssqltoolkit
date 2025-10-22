# Guía detallada: Publicación en GitHub y configuración de Auto-Update

Esta guía te lleva paso a paso para:
- Subir el proyecto MSSQL Tool Kit a un repositorio GitHub.
- Versionar y publicar artefactos con `electron-builder`.
- Mantener sincronizados `latest.yml` y los artefactos para el auto-updater (con provider `generic` o `github`).

## 1) Requisitos previos
- Tener instalado `git` y un usuario de GitHub.
- Tener NodeJS instalado (v18+ recomendado) y NPM.
- Haber inicializado el repo local (ya realizado: `git init` y `.gitignore`).

Opcional (pero recomendado):
- Configura tu identidad de Git:
  ```bash
  git config --global user.name "Tu Nombre"
  git config --global user.email "tu.email@example.com"
  ```

## 2) Crear el repositorio en GitHub
1. Entra a https://github.com/new.
2. Define el nombre del repo (por ejemplo `mssql-tool-kit`).
3. Privado o público según tu preferencia.
4. No inicialices con README ni `.gitignore` (ya lo tienes localmente).
5. Crea el repositorio.

## 3) Conectar remoto y primer push
En la carpeta del proyecto:
```bash
# Sustituye <usuario> y <repo>
git remote add origin https://github.com/<usuario>/<repo>.git

# Añade archivos y realiza commit inicial
git add .
# Revisa que dist/, node_modules/ y tsconfig.tsbuildinfo estén ignorados
git status -s --ignored

git commit -m "Inicializa MSSQL Tool Kit con Electron/Vite y auto-update"

# Empuja a la rama principal (main)
git push -u origin main
```

Si ya tenías `origin` configurado y quieres cambiarlo:
```bash
git remote set-url origin https://github.com/<usuario>/<repo>.git
```

## 4) Buenas prácticas de versionado
- Incrementa la versión en `package.json` antes de cada release (ej. de `0.0.1` a `0.0.2`).
- Haz commit del cambio de versión:
  ```bash
  npm version patch  # o minor/major
  # Esto actualiza package.json y crea un tag
  git push
  git push --tags
  ```
- Electron Builder usa `version` para nombrar artefactos y generar `latest.yml`.

## 5) Construcción de artefactos
- Para validar local sin publicar:
  ```bash
  npm run dist:win
  ```
  Genera instaladores en `release/`.

- Para publicar (según provider configurado en `package.json`):
  ```bash
  npm run release:win
  ```
  Subirá artefactos al destino definido en `build.publish`.

## 6) Opciones de publicación del auto-updater
### Opción A: Provider `generic` (servidor propio)
- En `package.json` ya está definido:
  ```json
  "publish": [{ "provider": "generic", "url": "${env.AUTO_UPDATE_URL}" }]
  ```
- Debes tener un servidor/hosting accesible por HTTP(S) que sirva:
  - `latest.yml`
  - Instalador/artefactos (`.exe`, `.zip`, `.blockmap`)
- Pasos:
  1. Sube los archivos generados en `release/` al directorio público del servidor.
  2. Asegúrate de mantener `latest.yml` en el mismo directorio que los artefactos.
  3. Establece la variable de entorno `AUTO_UPDATE_URL` (en CI o en tu entorno de build) apuntando al directorio público, por ejemplo:
     - `AUTO_UPDATE_URL=https://mi-servidor.com/downloads/mssql-tool-kit/`
  4. Ejecuta `npm run release:win` para construir y (si automatizas) subir al servidor.

### Opción B: Provider `github` (GitHub Releases)
- Cambia `build.publish` en `package.json` a:
  ```json
  "publish": [{
    "provider": "github",
    "owner": "<usuario-github>",
    "repo": "<repo>",
    "releaseType": "draft"  
  }]
  ```
- Requisitos:
  - Un token de GitHub (con permiso `repo`) en `GH_TOKEN`.
  - El repositorio debe existir y ser accesible.
- Flujo:
  1. Exporta tu token: `setx GH_TOKEN <tu_token>` o configúralo en CI.
  2. Ejecuta `npm run release:win`.
  3. Electron Builder creará o actualizará un Release subiendo `latest.yml` y artefactos.
  4. Publica el Release (si lo dejaste como `draft`).

## Configuración específica para tu repositorio

Usarás GitHub Releases en el repositorio `Furiade54/mssqltoolkit`:

- Ajuste en `package.json` (ya aplicado):
  ```json
  {
    "build": {
      "publish": [{
        "provider": "github",
        "owner": "Furiade54",
        "repo": "mssqltoolkit",
        "releaseType": "draft"
      }]
    }
  }
  ```
- Configura el token de GitHub con permisos `repo`:
  - En Windows (PowerShell): `setx GH_TOKEN "<tu_token>"`
  - En CI, añade `GH_TOKEN` como secreto.
- Conecta el remoto y sube el código si no lo hiciste:
  ```bash
  git remote add origin https://github.com/Furiade54/mssqltoolkit.git
  git add .
  git commit -m "Inicializa MSSQL Tool Kit"
  git push -u origin main
  ```
- Genera y publica un release (draft) con artefactos y `latest.yml`:
  ```bash
  npm run release:win
  ```
- Revisa en GitHub → Releases que:
  - Se creó el release en `Furiade54/mssqltoolkit`.
  - `latest.yml` y artefactos (`.exe`, `.zip`, `.blockmap`) están presentes.
- Instala la app y verifica que el auto-updater funcione:
  - La app empaquetada consultará Releases y mostrará progreso en la UI.

- Cada nueva versión debe reemplazar/sumar los artefactos y actualizar el `latest.yml` en ese directorio.

## 8) Verificación del auto-updater
- En desarrollo, el updater está deshabilitado por seguridad.
- En producción (`isPackaged`):
  - La app consultará `AUTO_UPDATE_URL` (provider `generic`) o Releases (provider `github`).
  - Se verán logs en `electron-log` y los eventos se reflejarán en la UI (MenuBar → estado/progreso).

## 9) Troubleshooting
- `permission denied` al subir a servidor: revisa permisos y rutas.
- `404` al descargar `latest.yml`: verifica la URL en `AUTO_UPDATE_URL` y que el archivo existe.
- Token de GitHub inválido: regenera el `GH_TOKEN` y revisa scopes.
- Rama principal distinta a `main`: ajusta `git push -u origin <tu_rama>`.
- HMR de Vite molestando: reinicia `npm run electron:dev` si hay inconsistencia por cambios en exports.

## 10) CI/CD (opcional)
- Puedes usar GitHub Actions para:
  - Construir en Windows (necesario para NSIS) y publicar a Releases.
  - Subir a un servidor `generic` mediante rsync/ftp/acciones personalizadas.
- Variables típicas en CI: `GH_TOKEN`, `AUTO_UPDATE_URL`.

## 11) Resumen rápido
1. Crea repo en GitHub y añade remoto.
2. `git add . && git commit -m "init" && git push -u origin main`.
3. Bump de versión (`npm version patch`) y push tags.
4. Elige provider:
   - `generic`: sube `latest.yml` y artefactos al mismo directorio del servidor.
   - `github`: configura `publish` con `github` y `GH_TOKEN`.
5. Ejecuta `npm run release:win`.
6. Verifica que la app en producción detecta la actualización y muestra progreso en la UI.