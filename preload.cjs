const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    exit: () => ipcRenderer.send("app:exit"),
    minimize: () => ipcRenderer.send("window:minimize"),
    maximizeToggle: () => ipcRenderer.send("window:maximize-toggle"),
    close: () => ipcRenderer.send("window:close"),
    toggleDevTools: () => ipcRenderer.send("window:devtools-toggle"),
    reload: () => ipcRenderer.send("window:reload"),
    forceReload: () => ipcRenderer.send("window:force-reload"),
    getVersion: () => ipcRenderer.invoke("app:getVersion"),
    getMeta: () => ipcRenderer.invoke("app:getMeta"),
    // AutoUpdate API (seguro)
    autoUpdate: {
        checkForUpdates: () => ipcRenderer.invoke("autoUpdate:check"),
        quitAndInstall: (options) => ipcRenderer.invoke("autoUpdate:quitAndInstall", options),
        onChecking: (cb) => {
            const h = (_e, payload) => cb?.(payload);
            ipcRenderer.on("autoUpdate:checking", h);
            return () => ipcRenderer.removeListener("autoUpdate:checking", h);
        },
        onAvailable: (cb) => {
            const h = (_e, info) => cb?.(info);
            ipcRenderer.on("autoUpdate:update-available", h);
            return () => ipcRenderer.removeListener("autoUpdate:update-available", h);
        },
        onNotAvailable: (cb) => {
            const h = (_e, info) => cb?.(info);
            ipcRenderer.on("autoUpdate:update-not-available", h);
            return () => ipcRenderer.removeListener("autoUpdate:update-not-available", h);
        },
        onError: (cb) => {
            const h = (_e, err) => cb?.(err);
            ipcRenderer.on("autoUpdate:error", h);
            return () => ipcRenderer.removeListener("autoUpdate:error", h);
        },
        onProgress: (cb) => {
            const h = (_e, p) => cb?.(p);
            ipcRenderer.on("autoUpdate:download-progress", h);
            return () => ipcRenderer.removeListener("autoUpdate:download-progress", h);
        },
        onDownloaded: (cb) => {
            const h = (_e, info) => cb?.(info);
            ipcRenderer.on("autoUpdate:update-downloaded", h);
            return () => ipcRenderer.removeListener("autoUpdate:update-downloaded", h);
        },
    },
    // MSSQL helpers
    saveMSSQLServer: (info) => ipcRenderer.invoke("mssql:saveServer", info),
    updateMSSQLServer: (index, info) => ipcRenderer.invoke("mssql:updateServer", { index, info }),
    deleteMSSQLServer: (index) => ipcRenderer.invoke("mssql:deleteServer", { index }),
    getMSSQLServers: () => ipcRenderer.invoke("mssql:getServers"),
    testMSSQLConnection: (info) => ipcRenderer.invoke("mssql:testConnection", info),
    validateMSSQLUser: (creds) => ipcRenderer.invoke("mssql:validateUser", creds),
    runMSSQLQuery: (payload) => ipcRenderer.invoke("mssql:runQuery", payload),
    saveMSSQLConsulta: (payload) => ipcRenderer.invoke("mssql:saveConsulta", payload),
    registerMSSQLUser: (payload) => ipcRenderer.invoke("mssql:registerUser", payload),
    ensureToolkit: (info) => ipcRenderer.invoke("mssql:ensureToolkit", info),
});


