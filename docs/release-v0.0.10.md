# MSSQL Tool Kit v0.0.10

Instalación con UAC al actualizar

- `quitAndInstall` invoca el instalador en modo no silencioso para solicitar UAC.
- `MenuBar` pasa opciones explícitas al instalar actualización.
- IPC principal acepta `{ isSilent, isForceRunAfter }`.
- Preload reenvía opciones y se actualizan los tipos.

nota personal: recordar Downloading ${Math.round(updateProgress ?? 0)}%` : "aqui";