# Guía de Auto-Actualización (AutoUpdate) – Mejoras y Procedimiento

Esta guía documenta en detalle las mejoras implementadas para que el mecanismo de auto-actualización funcione de forma confiable en MSSQL Tool Kit (v0.0.11) y establece un procedimiento claro para futuras versiones.

## Objetivo
- Evitar errores de actualización ("Update error") debidos a descargas 404 o metadatos incompletos.
- Alinear la convención de nombres de artefactos con lo que `electron-updater` espera descargar desde GitHub Releases.
- Automatizar la generación de `latest.yml` y la subida de artefactos a la release correspondiente.

## Contexto y síntoma
- El botón "Check for Updates" mostraba "Update error".
- En el log (`%APPDATA%\MSSQL Tool Kit\logs\main.log`) se observaron 404 al intentar descargar:
  - `.../MSSQL-Tool-Kit-0.0.11-Setup.exe.blockmap`
  - `.../MSSQL-Tool-Kit-0.0.11-Setup.exe`
- La release en GitHub tenía artefactos con nombres distintos (con **puntos** o **espacios**), por ejemplo:
  - `MSSQL.Tool.Kit-0.0.11-Setup.exe`
  - `MSSQL Tool Kit-0.0.11-Setup.exe`
- Esa diferencia de nombres provocaba 404 al resolver las URLs generadas por `electron-updater`.

## Arquitectura de actualización (resumen)
- Provider: `github` (definido en `package.json` → `build.publish`).
- Artefactos necesarios por `electron-updater`:
  - Instalador `.exe` del release objetivo.
  - Archivo `.blockmap` asociado al `.exe` para descarga diferencial.
  - `latest.yml` con:
    - `version`
    - `files[].url`, `sha512` (Base64) y `size` (bytes)
    - `path`, `sha512` y `releaseDate`
- El updater construye las URLs usando el **nombre del artefacto**; si no coincide con lo publicado, resulta en 404.

## Convención de nombres acordada
- Usar **guiones** en lugar de espacios o puntos:
  - `MSSQL-Tool-Kit-${version}-Setup.${ext}`
- Motivo: garantiza una URL estable y evitable de caracteres conflictivos; coincide con el patrón que el updater estaba solicitando.

## Cambios aplicados (v0.0.11)
1. **Publicación de artefactos con nombres guionados**
   - Se subieron a la release `v0.0.11`:
     - `MSSQL-Tool-Kit-0.0.11-Setup.exe`
     - `MSSQL-Tool-Kit-0.0.11-Setup.exe.blockmap`
     - `latest-hyphen.yml` (referenciando el `.exe` guionado)
   - Se mantuvieron los artefactos previos para compatibilidad (`latest.yml`, nombres con puntos/espacios).

2. **Generación correcta de `latest.yml`**
   - Se calculó `sha512` en Base64 y `size` del `.exe` guionado.
   - Ejemplo del contenido (adaptar versión/fechas en cada release):
     ```yaml
     version: 0.0.11
     files:
       - url: MSSQL-Tool-Kit-0.0.11-Setup.exe
         sha512: <BASE64_SHA512>
         size: <BYTES>
     path: MSSQL-Tool-Kit-0.0.11-Setup.exe
     sha512: <BASE64_SHA512>
     releaseDate: '2025-10-27T10:08:00.000Z'
     ```

3. **Verificación de URLs de assets**
   - Se validó que las URLs esperadas respondieran **200**:
     - `.../MSSQL-Tool-Kit-0.0.11-Setup.exe.blockmap` → 200
     - `.../MSSQL-Tool-Kit-0.0.11-Setup.exe` → 200

4. **Ajuste de `artifactName` para futuras versiones**
   - En `package.json` → `build.win.artifactName`:
     ```json
     "artifactName": "MSSQL-Tool-Kit-${version}-Setup.${ext}"
     ```
   - Esto fuerza la salida de artefactos con guiones al compilar, evitando discrepancias.

5. **Automatización de publicación**
   - Script: `scripts/release-win-gh.ps1` (compila frontend, empaqueta, genera `latest.yml`, sube assets)
   - Comando npm: `npm run release:win-gh`
   - Requisitos:
     - Tener `gh` CLI autenticado (`gh auth login`)
     - Contar con `GITHUB_TOKEN`/credenciales para subir assets
     - Cerrar instancias de la app instaladas para evitar bloqueo de `app.asar`

## Procedimiento recomendado para futuras releases
1. **Preparación**
   - Actualizar `version` en `package.json`.
   - Confirmar que `artifactName` mantiene el formato con guiones.
   - Verificar provider `github` en `build.publish`.

2. **Compilación y empaquetado**
   - `npm run build` (Vite)
   - `npm run release:win-gh` (automatiza empaquetado y subida)
   - Alternativa manual (si hiciera falta):
     - `npm run dist:win` (sin publicar)
     - Generar `latest.yml` con hash/size del `.exe` guionado
     - Subir `.exe`, `.blockmap` y `latest.yml` a la release con `gh release upload`

3. **Verificación**
   - Listar assets publicados:
     ```bash
     gh release view vX.Y.Z -R <owner>/<repo> --json assets --jq ".assets[].name"
     ```
   - Probar URLs esperadas por el updater:
     - `.../MSSQL-Tool-Kit-X.Y.Z-Setup.exe`
     - `.../MSSQL-Tool-Kit-X.Y.Z-Setup.exe.blockmap`
   - Ejecutar la aplicación instalada y usar "Check for Updates".
   - Revisar `%APPDATA%\MSSQL Tool Kit\logs\main.log`.

## Tips y checklist rápido (para evitar que el error reaparezca)
- Usar siempre nombres con guiones en artefactos: `MSSQL-Tool-Kit-${version}-Setup.${ext}`. Evitar espacios y puntos.
- Verificar que `artifactName` en `package.json` esté en formato guionado antes de compilar.
- Publicar siempre los tres archivos: `.exe`, `.exe.blockmap` y `latest.yml` que apunte al `.exe` guionado.
- Confirmar que la release sea de tipo `release` (no `draft`) y que el tag sea `vX.Y.Z` coincidente con `version`.
- Validar nombres exactos de assets tras subirlos:
  - `gh release view vX.Y.Z -R <owner>/<repo> --json assets --jq ".assets[].name"`
- Probar las URLs que el updater usará (deben dar 200):
  - `.../MSSQL-Tool-Kit-X.Y.Z-Setup.exe`
  - `.../MSSQL-Tool-Kit-X.Y.Z-Setup.exe.blockmap`
  - Ejemplo rápido:
    ```powershell
    $u = "https://github.com/<owner>/<repo>/releases/download/vX.Y.Z/MSSQL-Tool-Kit-X.Y.Z-Setup.exe";
    (Invoke-WebRequest -Uri $u -Method Head -UseBasicParsing).StatusCode # Debe ser 200
    ```
- Si republicas artefactos, usa `--clobber` para sobrescribir en la release y evitar duplicados.
- Asegúrate de que `latest.yml` tenga `sha512` (Base64) y `size` del `.exe` guionado y que `files[].url` y `path` coincidan con el nombre real.
- Cierra cualquier instancia instalada de la app antes de empaquetar para evitar bloqueos de `app.asar`.
- Si hay proxy/antivirus corporativo, valida que no haya inspección TLS que bloquee descargas desde `github.com`.
- Para diagnósticos, revisa `%APPDATA%\MSSQL Tool Kit\logs\main.log` y busca 404. Si aparece 404, compara nombres de assets con `latest.yml` y corrige.

## Troubleshooting
**404 en descarga**
- Confirmar que los nombres de assets de la release **coinciden** con los que `latest.yml` referencia y con lo que `electron-updater` construye.
- Usar `gh release view ... --json assets` para inspeccionar los nombres exactos.
- Asegurarse de que la release no esté en estado "draft" y sea de tipo `release`.

**Bloqueos de archivos (`app.asar` en uso)**
- Cerrar cualquier instancia instalada de la aplicación antes de empaquetar.
- En caso de persistir:
  - `taskkill /IM "MSSQL Tool Kit.exe" /F` (con precaución)
  - Reiniciar el empaquetado.

**`app-update.yml` ausente**
- Con provider `github`, no es requerido dentro de `win-unpacked/resources`. El updater consulta directamente la release y `latest.yml`.

**Red/Proxy**
- Si hay proxy, validar acceso a `github.com` y a URLs de assets de la release.
- Comprobar con `Invoke-WebRequest -Method Head` que responden 200.

## Registro y diagnóstico
- Ubicación de logs: `%APPDATA%\MSSQL Tool Kit\logs\main.log`.
- Ejemplo de error previo:
  ```
  Cannot download ...MSSQL-Tool-Kit-0.0.11-Setup.exe.blockmap, status 404
  Fallback to full download ...Setup.exe, status 404
  ```
- Objetivo: no deben aparecer 404; descargas diferenciales deberían funcionar o caer a descarga completa **exitosa**.

## Seguridad e integridad
- `latest.yml` incluye `sha512` en Base64 y `size` en bytes.
- El updater valida integridad al terminar la descarga.
- El `.blockmap` habilita descargas parciales eficientes.

## Compatibilidad
- Se mantienen ambos esquemas de nombres en la release (`guiones` y `puntos/espacios`) por compatibilidad histórica.
- El esquema **guionado** es el estándar recomendado y el que el updater espera.

## Referencias útiles
- `package.json` (sección `build`): provider GitHub, `artifactName` con guiones.
- `scripts/release-win-gh.ps1`: automatiza build, empaquetado, `latest.yml` y subida de assets.
- Comandos `gh` CLI: `gh release create`, `gh release upload`, `gh release view`.

---
**Conclusión**:
Con la unificación de nombres de artefactos (formato con guiones), la generación correcta de `latest.yml`, y la automatización de subida a GitHub, el proceso de auto-actualización funciona de forma consistente y sin errores. Siguiendo el procedimiento de esta guía, las futuras versiones deberían actualizarse correctamente desde la aplicación instalada.