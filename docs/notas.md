Perfecto, lo dejamos manual por ahora. Te dejo un flujo claro y compacto para repetir la publicación en próximas versiones.

Flujo Manual de Release

- Actualiza versión y changelog
  - Edita package.json y CHANGELOG.md a la nueva versión.
  - Opcional: npm version patch si prefieres que git marque el tag automáticamente.
- Limpia artefactos previos
  - Remove-Item -Recurse -Force dist, dist-release, dist-release2 (PowerShell).
- Construye instalador
  - npm run dist:win para generar dist-release\MSSQL.Tool.Kit-<vers>-Setup.exe .
- Genera latest.yml
  - Hash base64: Get-FileHash "dist-release\\MSSQL.Tool.Kit-<vers>-Setup.exe" -Algorithm SHA512 | % { [Convert]::ToBase64String([Convert]::FromHexString($_.Hash)) }
  - Tamaño: (Get-Item "dist-release\\MSSQL.Tool.Kit-<vers>-Setup.exe").Length
  - Crea/actualiza dist-release\\latest.yml con:
    - url y path : MSSQL.Tool.Kit-<vers>-Setup.exe (exacto, con puntos).
    - sha512 : hash base64.
    - size : tamaño en bytes.
    - releaseDate : ISO UTC, por ejemplo Get-Date -AsUTC -Format o .
- Publica en GitHub Releases
  - Crear release: gh release create v<vers> -t "MSSQL Tool Kit v<vers>" -F "docs\\release-v<vers>.md" "dist-release\\MSSQL.Tool.Kit-<vers>-Setup.exe" "dist-release\\MSSQL.Tool.Kit-<vers>-Setup.exe.blockmap"
  - Subir manifest: gh release upload v<vers> "dist-release\\latest.yml" --clobber
- Etiquetas y main
  - git push origin main
  - git push --tags (si usaste npm version o creaste el tag manualmente).
Reglas de Asset/Manifest

- El nombre del archivo en latest.yml debe coincidir exactamente con el asset publicado (en tu repo utiliza puntos: MSSQL.Tool.Kit-... ).
- sha512 en latest.yml va en base64, no hex.
- path y url suelen ser iguales al nombre del instalador.
- Usa fecha en UTC y formato ISO ( 2025-10-23T16:20:52Z ).
Prueba de Actualización

- Desde la versión anterior, ejecuta “Instalar actualización” en la app.
- Debe abrir el instalador en modo no silencioso y mostrar UAC.
- Si aparece “Update error (100%)”:
  - Verifica coincidencia de nombres entre asset y latest.yml .
  - Revisa logs: autoUpdater.logger = require('electron-log'); autoUpdater.logger.transports.file.level = 'debug' .
  - Confirma permisos en %LOCALAPPDATA%/MSSQL Tool Kit/ y conectividad a GitHub.
Cuando quieras automatizar, preparo un workflow de Actions que construya y adjunte assets al crear un tag, respetando el nombre de archivo y el latest.yml .