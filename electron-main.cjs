// Electron main process
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const sql = require("mssql");
const http = require("http");
const https = require("https");
// Auto update and logging
const { autoUpdater } = require("electron-updater");
const log = require("electron-log");

let mainWindow = null;

// Configure logging
log.transports.file.level = "info";
autoUpdater.logger = log;

// Helpful app identity for Windows
try {
  app.setName("MSSQL Tool Kit");
  app.setAppUserModelId("com.mssqltoolkit.app");
} catch {}

async function waitForUrl(url, timeoutMs = 30000) {
  const start = Date.now();
  try {
    const u = new URL(url);
    const client = u.protocol === "https:" ? https : http;
    return await new Promise((resolve, reject) => {
      const attempt = () => {
        const req = client.request(
          { hostname: u.hostname, port: u.port || (u.protocol === "https:" ? 443 : 80), path: "/", method: "GET" },
          (res) => {
            res.resume();
            const ok = (res.statusCode || 0) >= 200 && (res.statusCode || 0) < 500;
            if (ok) {
              resolve(true);
            } else {
              scheduleNext();
            }
          }
        );
        req.on("error", scheduleNext);
        req.end();
      };
      const scheduleNext = () => {
        if (Date.now() - start > timeoutMs) {
          reject(new Error(`Timeout esperando ${url}`));
        } else {
          setTimeout(attempt, 500);
        }
      };
      attempt();
    });
  } catch (e) {
    throw e;
  }
}

function sendUpdate(channel, payload) {
  try {
    const win = BrowserWindow.getFocusedWindow() || mainWindow;
    win && win.webContents.send(channel, payload);
  } catch (e) {
    log.error("IPC send update error:", e);
  }
}

function initAutoUpdater() {
  if (!app.isPackaged) {
    log.info("AutoUpdater deshabilitado en desarrollo");
    return;
  }

  const feedURL = process.env.AUTO_UPDATE_URL;
  if (feedURL) {
    try {
      autoUpdater.setFeedURL({ url: feedURL });
      log.info("Feed URL configurado:", feedURL);
    } catch (e) {
      log.warn("No se pudo configurar feedURL (probablemente usando provider GitHub):", e);
    }
  }

  autoUpdater.on("checking-for-update", () => {
    log.info("Buscando actualización...");
    sendUpdate("autoUpdate:checking", null);
  });
  autoUpdater.on("update-available", (info) => {
    log.info("Actualización disponible:", info);
    sendUpdate("autoUpdate:update-available", info);
  });
  autoUpdater.on("update-not-available", (info) => {
    log.info("No hay actualización:", info);
    sendUpdate("autoUpdate:update-not-available", info);
  });
  autoUpdater.on("error", (err) => {
    log.error("AutoUpdater error:", err);
    sendUpdate("autoUpdate:error", String(err?.message || err));
  });
  autoUpdater.on("download-progress", (progress) => {
    sendUpdate("autoUpdate:download-progress", progress);
  });
  autoUpdater.on("update-downloaded", (info) => {
    log.info("Actualización descargada:", info);
    sendUpdate("autoUpdate:update-downloaded", info);
  });
}

async function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1000,
		height: 700,
		frame: false,
		backgroundColor: "#1e1e1e",
		webPreferences: {
			contextIsolation: true,
			nodeIntegration: false,
            preload: path.join(__dirname, "preload.cjs"),
		},
	});

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

	mainWindow.on("closed", () => {
		mainWindow = null;
	});
}

app.whenReady().then(() => {
  initAutoUpdater();
  createWindow();
  // Comienza la búsqueda de actualización automática al iniciar
  if (app.isPackaged) {
    try {
      autoUpdater.checkForUpdatesAndNotify();
    } catch (e) {
      log.warn("checkForUpdatesAndNotify falló:", e);
    }
  }
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
	if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// IPC: Auto Update controls
ipcMain.handle("autoUpdate:check", async () => {
  if (!app.isPackaged) return { ok: false, error: "dev-mode" };
  try {
    const result = await autoUpdater.checkForUpdates();
    return { ok: true, result };
  } catch (e) {
    log.error("Error al buscar actualización:", e);
    return { ok: false, error: String(e?.message || e) };
  }
});

ipcMain.handle("autoUpdate:quitAndInstall", async (_event, options) => {
  try {
    const isSilent = options?.isSilent ?? false;
    const isForceRunAfter = options?.isForceRunAfter ?? true;
    autoUpdater.quitAndInstall(isSilent, isForceRunAfter);
    return { ok: true };
  } catch (e) {
    log.error("Error en quitAndInstall:", e);
    return { ok: false, error: String(e?.message || e) };
  }
});

// IPC: handle request to exit the app from renderer
ipcMain.on("app:exit", () => {
    app.quit();
});

ipcMain.handle("app:getVersion", () => app.getVersion());

ipcMain.handle("app:getMeta", () => {
    try {
        const pkgPath = path.join(__dirname, "package.json");
        const pkgRaw = fs.readFileSync(pkgPath, "utf8");
        const pkg = JSON.parse(pkgRaw);
        const version = pkg.version || app.getVersion();
        const license = pkg.license || "UNLICENSED";
        const createdAt = process.env.APP_CREATED_AT || "2025-10-15";
        return { version, license, createdAt };
    } catch (e) {
        return { version: app.getVersion(), license: "UNLICENSED", createdAt: "2025-10-15" };
    }
});

// IPC: window controls
ipcMain.on("window:minimize", () => {
    const win = BrowserWindow.getFocusedWindow() || mainWindow;
    if (win) win.minimize();
});

ipcMain.on("window:maximize-toggle", () => {
    const win = BrowserWindow.getFocusedWindow() || mainWindow;
    if (!win) return;
    if (win.isMaximized()) {
        win.restore();
    } else {
        win.maximize();
    }
});

ipcMain.on("window:close", () => {
    const win = BrowserWindow.getFocusedWindow() || mainWindow;
    if (win) win.close();
});

// IPC: toggle DevTools
ipcMain.on("window:devtools-toggle", () => {
    const win = BrowserWindow.getFocusedWindow() || mainWindow;
    if (!win) return;
    if (win.webContents.isDevToolsOpened()) {
        win.webContents.closeDevTools();
    } else {
        win.webContents.openDevTools({ mode: "detach" });
    }
});

// Recarga de ventana desde IPC
ipcMain.on("window:reload", () => {
    const win = BrowserWindow.getFocusedWindow() || mainWindow;
    if (!win) return;
    try {
        win.webContents.reload();
    } catch {}
});

ipcMain.on("window:force-reload", () => {
    const win = BrowserWindow.getFocusedWindow() || mainWindow;
    if (!win) return;
    try {
        win.webContents.reloadIgnoringCache();
    } catch {}
});

// IPC: MSSQL server config persistence
function getServersFilePath() {
    try {
        return path.join(app.getPath("userData"), "servers.json");
    } catch (e) {
        // Fallback to local directory if userData path fails (unlikely)
        return path.join(__dirname, "servers.json");
    }
}

function readServersList() {
    const filePath = getServersFilePath();
    try {
        if (!fs.existsSync(filePath)) return [];
        const raw = fs.readFileSync(filePath, "utf8");
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch (e) {
        return [];
    }
}

// Find server index by IP (ID = "server-ip")
function findServerIndexByIp(ip, servers) {
    const needle = String(ip || "").trim();
    if (!needle) return -1;
    const list = Array.isArray(servers) ? servers : [];
    for (let i = 0; i < list.length; i++) {
        if (String(list[i]?.ip || "").trim() === needle) return i;
    }
    return -1;
}

ipcMain.handle("mssql:getServers", () => {
    return readServersList();
});

ipcMain.handle("mssql:saveServer", (_event, info) => {
    try {
        const filePath = getServersFilePath();
        const servers = readServersList();
        const entry = {
            name: String(info?.name || ""),
            ip: String(info?.ip || ""),
            port: String(info?.port || ""),
            user: String(info?.user || ""),
            password: String(info?.password || ""),
            createdAt: new Date().toISOString(),
        };
        // Ensure directory exists for userData
        try {
            const dir = path.dirname(filePath);
            fs.mkdirSync(dir, { recursive: true });
        } catch {}
        servers.push(entry);
        fs.writeFileSync(filePath, JSON.stringify(servers, null, 2), "utf8");
        return { ok: true };
    } catch (e) {
        return { ok: false, error: String(e?.message || e) };
    }
});

ipcMain.handle("mssql:updateServer", (_event, payload) => {
    try {
        const filePath = getServersFilePath();
        const servers = readServersList();
        const index = Number(payload?.index);
        const info = payload?.info || {};
        if (!Number.isFinite(index) || index < 0 || index >= servers.length) {
            return { ok: false, error: "Índice de servidor inválido" };
        }
        const prev = servers[index] || {};
        const entry = {
            name: String(info?.name ?? prev.name ?? ""),
            ip: String(info?.ip ?? prev.ip ?? ""),
            port: String(info?.port ?? prev.port ?? ""),
            user: String(info?.user ?? prev.user ?? ""),
            password: String(info?.password ?? prev.password ?? ""),
            createdAt: prev.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        servers[index] = entry;
        try {
            const dir = path.dirname(filePath);
            fs.mkdirSync(dir, { recursive: true });
        } catch {}
        fs.writeFileSync(filePath, JSON.stringify(servers, null, 2), "utf8");
        return { ok: true };
    } catch (e) {
        return { ok: false, error: String(e?.message || e) };
    }
});

ipcMain.handle("mssql:deleteServer", (_event, payload) => {
    try {
        const filePath = getServersFilePath();
        const servers = readServersList();
        const index = Number(payload?.index);
        if (!Number.isFinite(index) || index < 0 || index >= servers.length) {
            return { ok: false, error: "Índice de servidor inválido" };
        }
        servers.splice(index, 1);
        try {
            const dir = path.dirname(filePath);
            fs.mkdirSync(dir, { recursive: true });
        } catch {}
        fs.writeFileSync(filePath, JSON.stringify(servers, null, 2), "utf8");
        return { ok: true };
    } catch (e) {
        return { ok: false, error: String(e?.message || e) };
    }
});

// IPC: MSSQL test connection
ipcMain.handle("mssql:testConnection", async (_event, info) => {
    const server = String(info?.ip || info?.server || "").trim();
    const portNum = info?.port !== undefined && info?.port !== null ? Number(info.port) : 1433;
    const user = String(info?.user || "").trim();
    const password = String(info?.password || "").trim();
    const database = String(info?.database || "master").trim();
    const encrypt = info?.encrypt === true ? true : false; // por defecto sin TLS en redes locales
    const config = {
        server,
        port: Number.isFinite(portNum) && portNum > 0 ? portNum : 1433,
        user,
        password,
        database,
        connectionTimeout: 7000,
        requestTimeout: 7000,
        options: {
            encrypt,
            trustServerCertificate: true,
        },
    };
    log.info(`[mssql:testConnection] server=${server} port=${config.port} db=${database} encrypt=${encrypt}`);
    try {
        await sql.connect(config);
        // Run a lightweight query to ensure connectivity
        await sql.query("SELECT TOP 1 name FROM sys.databases");
        await sql.close();
        log.info("[mssql:testConnection] OK");
        return { ok: true };
    } catch (e) {
        try { await sql.close(); } catch {}
        log.error(`[mssql:testConnection] ERROR: ${String(e?.message || e)}`);
        return { ok: false, error: String(e?.message || e) };
    }
});

// IPC: MSSQL validate user credentials in Opciones database
ipcMain.handle("mssql:validateUser", async (_event, creds) => {
    const { username, password, encrypt = false, serverIndex, serverIp } = creds || {};
    const servers = readServersList();
    if (!servers || servers.length === 0) {
        return { ok: false, error: "No hay servidor MSSQL configurado. Agrega uno primero." };
    }
    let idx = -1;
    if (serverIp) {
        idx = findServerIndexByIp(serverIp, servers);
    }
    if (!Number.isFinite(idx) || idx < 0) {
        idx = typeof serverIndex === "number" ? serverIndex : servers.length - 1;
    }
    if (!Number.isFinite(idx) || idx < 0 || idx >= servers.length) idx = servers.length - 1;
    const target = servers[idx];
    const server = String(target?.ip || "").trim();
    const portNum = target?.port !== undefined && target?.port !== null ? Number(target.port) : 1433;
    const user = String(target?.user || "").trim();
    const pass = String(target?.password || "").trim();
    const config = {
        server,
        port: Number.isFinite(portNum) && portNum > 0 ? portNum : 1433,
        user,
        password: pass,
        database: "Opciones",
        connectionTimeout: 7000,
        requestTimeout: 7000,
        options: {
            encrypt,
            trustServerCertificate: true,
        },
    };
    log.info(`[mssql:validateUser] server=${server} port=${config.port} db=Opciones encrypt=${encrypt} user=${username} serverIndex=${idx}`);
    try {
        await sql.connect(config);
        const request = new sql.Request();
        request.input("codigo", sql.VarChar, String(username || ""));
        request.input("clave", sql.VarChar, String(password || ""));
        const result = await request.query(
            "SELECT Codigo, Clave FROM Opciones.dbo.GENUsuario WHERE Codigo = @codigo AND Clave = @clave"
        );
        await sql.close();
        const ok = Array.isArray(result?.recordset) && result.recordset.length > 0;
        if (ok) {
            activeServerIndex = idx; // track active server on successful login
        }
        return ok ? { ok: true } : { ok: false, error: "Usuario o contraseña inválidos." };
    } catch (e) {
        try { await sql.close(); } catch {}
        log.error(`[mssql:validateUser] ERROR: ${String(e?.message || e)}`);
        return { ok: false, error: String(e?.message || e) };
    }
});

// IPC: MSSQL run arbitrary query using saved server (defaults to active)
ipcMain.handle("mssql:runQuery", async (_event, payload) => {
    const { sqlText, database = "Opciones", encrypt = false, serverIndex, serverIp } = payload || {};
    if (!sqlText || typeof sqlText !== "string" || !sqlText.trim()) {
        return { ok: false, error: "SQL inválido o vacío" };
    }
    const servers = readServersList();
    if (!servers || servers.length === 0) {
        return { ok: false, error: "No hay servidor MSSQL configurado. Agrega uno primero." };
    }
    let idx = -1;
    if (serverIp) {
        idx = findServerIndexByIp(serverIp, servers);
    }
    if (!Number.isFinite(idx) || idx < 0) {
        idx = typeof serverIndex === "number" ? serverIndex : (Number.isFinite(activeServerIndex) && activeServerIndex >= 0 ? activeServerIndex : servers.length - 1);
    }
    if (!Number.isFinite(idx) || idx < 0 || idx >= servers.length) idx = servers.length - 1;

    const target = servers[idx];
    const server = String(target?.ip || "").trim();
    const portNum = target?.port !== undefined && target?.port !== null ? Number(target.port) : 1433;
    const user = String(target?.user || "").trim();
    const pass = String(target?.password || "").trim();

    const baseConfig = {
        server,
        port: Number.isFinite(portNum) && portNum > 0 ? portNum : 1433,
        user,
        password: pass,
        connectionTimeout: 15000,
        requestTimeout: 30000,
        options: {
            encrypt: !!encrypt,
            trustServerCertificate: true,
        },
    };

    const dbName = String(database || "master").trim();
    log.info(`[mssql:runQuery] server=${server} port=${baseConfig.port} db=${dbName} idx=${idx}`);

    try {
        // Check database existence on target server using master
        await sql.connect({ ...baseConfig, database: "master" });
        const req1 = new sql.Request();
        req1.input("db", sql.NVarChar, dbName);
        const existsRes = await req1.query("SELECT TOP 1 name FROM sys.databases WHERE name = @db");
        await sql.close();
        const exists = Array.isArray(existsRes?.recordset) && existsRes.recordset.length > 0;
        if (!exists) {
            return { ok: false, error: `Base de datos '${dbName}' no existe en ${server}` };
        }

        // Connect to target database and run query
        await sql.connect({ ...baseConfig, database: dbName });
        const result = await sql.query(sqlText);
        await sql.close();
        const rows = Array.isArray(result?.recordset) ? result.recordset : [];
        const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
        return { ok: true, rows, columns, count: rows.length };
    } catch (e) {
        try { await sql.close(); } catch {}
        log.error(`[mssql:runQuery] ERROR: ${String(e?.message || e)}`);
        return { ok: false, error: String(e?.message || e) };
    }
});

// IPC: MSSQL save or update consulta into Opciones.dbo.GENConsultas
ipcMain.handle("mssql:saveConsulta", async (_event, payload) => {
    const { codigoAplicacion = "8", descripcion, consulta, reporteAsociado = null, encrypt = false, serverIndex, serverIp } = payload || {};
    const cod = String(codigoAplicacion || "").trim();
    const desc = String(descripcion || "").trim();
    const sqlText = typeof consulta === "string" ? consulta : String(consulta ?? "");
    const rep = reporteAsociado === null || reporteAsociado === undefined ? null : String(reporteAsociado);

    if (!cod || cod.length > 2) return { ok: false, error: "CodigoAplicacion inválido" };
    if (!desc || desc.length > 50) return { ok: false, error: "Descripcion inválida o demasiado larga (<=50)" };
    if (!sqlText || !String(sqlText).trim()) return { ok: false, error: "Consulta SQL vacía" };

    const servers = readServersList();
    if (!servers || servers.length === 0) {
        return { ok: false, error: "No hay servidor MSSQL configurado. Agrega uno primero." };
    }
    let idx = -1;
    if (serverIp) {
        idx = findServerIndexByIp(serverIp, servers);
    }
    if (!Number.isFinite(idx) || idx < 0) {
        idx = typeof serverIndex === "number" ? serverIndex : (Number.isFinite(activeServerIndex) && activeServerIndex >= 0 ? activeServerIndex : servers.length - 1);
    }
    if (!Number.isFinite(idx) || idx < 0 || idx >= servers.length) idx = servers.length - 1;

    const target = servers[idx];
    const server = String(target?.ip || "").trim();
    const portNum = target?.port !== undefined && target?.port !== null ? Number(target.port) : 1433;
    const pass = String(target?.password || "").trim();
    const user = String(target?.user || "").trim();

    const config = {
        server,
        port: Number.isFinite(portNum) && portNum > 0 ? portNum : 1433,
        user,
        password: pass,
        database: "Opciones",
        connectionTimeout: 15000,
        requestTimeout: 30000,
        options: {
            encrypt: !!encrypt,
            trustServerCertificate: true,
        },
    };

    log.info(`[mssql:saveConsulta] server=${server} port=${config.port} db=${config.database} idx=${idx}`);

    try {
        await sql.connect(config);
        const request = new sql.Request();
        request.input("CodigoAplicacion", sql.VarChar(2), cod);
        request.input("Descripcion", sql.VarChar(50), desc);
        request.input("Consulta", sql.VarChar(sql.MAX), String(sqlText));
        if (rep === null) {
            request.input("ReporteAsociado", sql.VarChar(sql.MAX), null);
        } else {
            request.input("ReporteAsociado", sql.VarChar(sql.MAX), rep);
        }

        // Check if exists
        const exists = await request.query(
            "SELECT TOP 1 1 AS existsFlag FROM Opciones.dbo.GENConsultas WHERE CodigoAplicacion = @CodigoAplicacion AND Descripcion = @Descripcion"
        );
        const hasRow = Array.isArray(exists?.recordset) && exists.recordset.length > 0;

        if (hasRow) {
            await request.query(
                "UPDATE Opciones.dbo.GENConsultas SET Consulta = @Consulta, ReporteAsociado = @ReporteAsociado WHERE CodigoAplicacion = @CodigoAplicacion AND Descripcion = @Descripcion"
            );
            await sql.close();
            return { ok: true, updated: true };
        } else {
            await request.query(
                "INSERT INTO Opciones.dbo.GENConsultas (CodigoAplicacion, Descripcion, Consulta, ReporteAsociado) VALUES (@CodigoAplicacion, @Descripcion, @Consulta, @ReporteAsociado)"
            );
            await sql.close();
            return { ok: true, inserted: true };
        }
    } catch (e) {
        try { await sql.close(); } catch {}
        log.error(`[mssql:saveConsulta] ERROR: ${String(e?.message || e)}`);
        return { ok: false, error: String(e?.message || e) };
    }
});


