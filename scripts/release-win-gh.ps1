Param()

$ErrorActionPreference = 'Stop'

# Ir al root del proyecto (un nivel arriba del directorio de scripts)
Set-Location (Join-Path $PSScriptRoot '..')

Write-Host "[release-win-gh] Compilando front con Vite..." -ForegroundColor Cyan
npm run build

Write-Host "[release-win-gh] Empaquetando instalador Windows (publish: never)..." -ForegroundColor Cyan
npx electron-builder --win --publish never

# Obtener versión desde package.json
$pkg = Get-Content 'package.json' -Raw | ConvertFrom-Json
$version = $pkg.version
$exe = "dist-release/MSSQL-Tool-Kit-$version-Setup.exe"
$blockmap = "$exe.blockmap"

if (-not (Test-Path $exe)) { throw "No se encontró el instalador: $exe" }
if (-not (Test-Path $blockmap)) { throw "No se encontró el blockmap: $blockmap" }

Write-Host "[release-win-gh] Generando latest.yml..." -ForegroundColor Cyan
$bytes = [System.IO.File]::ReadAllBytes($exe)
$sha512Bytes = [System.Security.Cryptography.SHA512]::Create().ComputeHash($bytes)
$sha512Base64 = [System.Convert]::ToBase64String($sha512Bytes)
$size = (Get-Item $exe).Length
$releaseDate = [DateTime]::UtcNow.ToString('o')
$yaml = @"
version: $version
files:
  - url: MSSQL-Tool-Kit-$version-Setup.exe
    sha512: $sha512Base64
    size: $size
path: MSSQL-Tool-Kit-$version-Setup.exe
sha512: $sha512Base64
releaseDate: '$releaseDate'
"@
Set-Content -Path "dist-release/latest.yml" -Value $yaml -Encoding UTF8
Write-Host "[release-win-gh] latest.yml generado." -ForegroundColor Green

# Crear release si no existe y subir assets
$tag = "v$version"
Write-Host "[release-win-gh] Creando release $tag si no existe..." -ForegroundColor Cyan
try {
  gh release view $tag | Out-Null
  Write-Host "[release-win-gh] Release $tag ya existe, se usarán assets --clobber" -ForegroundColor Yellow
} catch {
  $notesFile = "docs/release-v$version.md"
  if (-not (Test-Path $notesFile)) { $notesFile = $null }
  if ($notesFile) {
    gh release create $tag --title "Release v$version" --notes-file $notesFile | Out-Null
  } else {
    gh release create $tag --title "Release v$version" --notes "Auto release $version" | Out-Null
  }
  Write-Host "[release-win-gh] Release $tag creado." -ForegroundColor Green
}

Write-Host "[release-win-gh] Subiendo assets (.exe, .blockmap, latest.yml)..." -ForegroundColor Cyan
gh release upload $tag "dist-release/latest.yml" "$exe" "$blockmap" --clobber | Out-Null
Write-Host "[release-win-gh] Assets subidos correctamente a $tag" -ForegroundColor Green

Write-Host "[release-win-gh] Finalizado." -ForegroundColor Green