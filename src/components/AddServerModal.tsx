import React from "react";

type DraggableStyle = React.CSSProperties & { WebkitAppRegion?: "drag" | "no-drag" };

export type ServerInfo = {
    name: string;
    ip: string;
    port: string;
    user: string;
    password: string;
};

export default function AddServerModal({
    open,
    onClose,
    onSave,
}: {
    open: boolean;
    onClose: () => void;
    onSave: (info: ServerInfo) => void | Promise<void>;
}) {
    const [name, setName] = React.useState("");
    const [ip, setIp] = React.useState("");
    const [port, setPort] = React.useState("");
    const [user, setUser] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [servers, setServers] = React.useState<Array<ServerInfo & { createdAt?: string; updatedAt?: string }>>([]);
    const [selectedIndex, setSelectedIndex] = React.useState<number>(-1);
    const [loadingList, setLoadingList] = React.useState(false);
    const [saving, setSaving] = React.useState(false);
    const [testing, setTesting] = React.useState(false);
    const [testMessage, setTestMessage] = React.useState<string | null>(null);
    const [testOk, setTestOk] = React.useState<boolean | null>(null);
    const [editing, setEditing] = React.useState(false);
    const [saveError, setSaveError] = React.useState<string | null>(null);
    const [deleting, setDeleting] = React.useState(false);
    const suppressAutoSelectRef = React.useRef(false);
    const nameInputRef = React.useRef<HTMLInputElement | null>(null);
    const [banner, setBanner] = React.useState<string | null>(null);
    const bannerTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

    if (!open) return null;

    const loadServers = React.useCallback(async () => {
        setLoadingList(true);
        try {
            const list = await window.electronAPI?.getMSSQLServers?.();
            setServers(list || []);
        } catch (e) {
            console.error("Error al cargar servidores:", e);
        } finally {
            setLoadingList(false);
        }
    }, []);

    React.useEffect(() => {
        if (open) {
            loadServers();
        }
    }, [open, loadServers]);

    // Asegurar que, si existe al menos un servidor (especialmente cuando hay solo uno),
    // se seleccione automáticamente y se carguen los campos para edición/visualización.
    React.useEffect(() => {
        if (!open) return;
        if (servers.length > 0 && (selectedIndex < 0 || selectedIndex >= servers.length)) {
            if (suppressAutoSelectRef.current) {
                // Saltar una vez el autoselect si venimos de “Nuevo”
                suppressAutoSelectRef.current = false;
            } else {
                handleSelect(0);
            }
        }
        // Cuando no hay servidores, dejar formulario en modo "Nuevo" y enfocar primer campo
        if (servers.length === 0) {
            if (selectedIndex !== -1) setSelectedIndex(-1);
            if (!editing) {
                clearForm();
                setTimeout(() => nameInputRef.current?.focus(), 0);
            }
        }
    }, [open, servers, selectedIndex]);

    function clearForm() {
        setName("");
        setIp("");
        setPort("");
        setUser("");
        setPassword("");
        setSelectedIndex(-1);
        setTestMessage(null);
        setTestOk(null);
        setEditing(true);
        setSaveError(null);
    }

    function handleNew() {
        // Evitar que el efecto de autoselección vuelva a seleccionar el índice 0
        suppressAutoSelectRef.current = true;
        clearForm();
        // Reasignar foco a la ventana e inputs tras posibles diálogos previos
        try { window.focus(); } catch {}
        // Enfocar el primer campo para acelerar el alta
        setTimeout(() => nameInputRef.current?.focus(), 0);
    }

    function showBanner(message: string) {
        if (bannerTimerRef.current) {
            clearTimeout(bannerTimerRef.current);
            bannerTimerRef.current = null;
        }
        setBanner(message);
        bannerTimerRef.current = setTimeout(() => setBanner(null), 2500);
    }

    React.useEffect(() => {
        return () => {
            if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
        };
    }, []);

    async function handleSave() {
        // Validación: Nombre e IP son obligatorios
        if (!name.trim() || !ip.trim()) {
            setSaveError("Nombre e IP servidor son obligatorios");
            return;
        }
        setSaving(true);
        try {
            if (selectedIndex >= 0) {
                const res = await window.electronAPI?.updateMSSQLServer?.(selectedIndex, { name, ip, port, user, password });
                console.log("Servidor actualizado:", res);
                await loadServers();
                setEditing(false);
            } else {
                await onSave({ name, ip, port, user, password });
                // Mantener abierto el modal, recargar y seleccionar el recién creado
                const list = await window.electronAPI?.getMSSQLServers?.();
                const next = Array.isArray(list) ? list : [];
                setServers(next);
                if (next.length > 0) {
                    const newIndex = next.length - 1;
                    const ns = next[newIndex];
                    setSelectedIndex(newIndex);
                    setName(ns?.name || name);
                    setIp(ns?.ip || ip);
                    setPort(ns?.port || port);
                    setUser(ns?.user || user);
                    setPassword(ns?.password || password);
                    setEditing(false);
                    setTestMessage(null);
                    setTestOk(null);
                    setSaveError(null);
                    showBanner("Servidor creado");
                } else {
                    // Si por alguna razón no se devolvió la lista, mantener datos actuales
                    setEditing(false);
                    showBanner("Servidor creado");
                }
            }
        } finally {
            setSaving(false);
        }
    }

    async function handleTestConnection() {
        setTesting(true);
        setTestMessage(null);
        setTestOk(null);
        try {
            const res = await window.electronAPI?.testMSSQLConnection?.({ ip, port, user, password });
            if (res?.ok) {
                // Tras conexión exitosa, asegurar base y estructura mssqltoolkit
                const ensureRes = await window.electronAPI?.ensureToolkit?.({ ip, port, user, password, encrypt: false });
                if (ensureRes?.ok) {
                    const createdDb = ensureRes.databaseCreated === true;
                    const seededAdmin = ensureRes.seededAdmin === true;
                    let msg = createdDb
                        ? "Conexión exitosa. Base mssqltoolkit creada y tablas listas."
                        : "Conexión exitosa. Base mssqltoolkit verificada y tablas listas.";
                    if (seededAdmin) msg += " Usuario admin sembrado.";
                    setTestMessage(msg);
                    setTestOk(true);
                } else {
                    setTestMessage((ensureRes?.error ? `Conexión ok. Falló ensureToolkit: ${ensureRes.error}` : "Conexión ok. Falló ensureToolkit"));
                    setTestOk(false);
                }
            } else {
                setTestMessage(res?.error || "Error al probar conexión");
                setTestOk(false);
            }
        } catch (e) {
            setTestMessage(String((e as Error)?.message || e));
            setTestOk(false);
        } finally {
            setTesting(false);
        }
    }

    function handleSelect(index: number) {
        setSelectedIndex(index);
        const s = servers[index];
        if (!s) return;
        setName(s.name || "");
        setIp(s.ip || "");
        setPort(s.port || "");
        setUser(s.user || "");
        setPassword(s.password || "");
        setEditing(false);
        setTestMessage(null);
        setTestOk(null);
        setSaveError(null);
    }

    function handleDropdownChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const val = e.target.value;
        if (!val) {
            clearForm();
            return;
        }
        const idx = parseInt(val, 10);
        if (!Number.isNaN(idx)) handleSelect(idx);
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 grid place-items-center bg-black/50"
            style={{ WebkitAppRegion: "no-drag" } as DraggableStyle}
        >
            <div
                className="w-[420px] rounded-md border border-black/50 bg-[#2d2d2d] p-4 text-sm text-gray-200 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="mb-3 text-base font-semibold">Servidores MSSQL</h2>

                <div className="space-y-3">
                    <div>
                        <div className="mb-1 flex items-center justify-between text-[13px] text-gray-300">
                            <span>Servidores guardados</span>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={handleNew}
                                    className="rounded bg-white/10 px-2 py-1 text-[12px] text-gray-200 hover:bg-white/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                                >
                                    Nuevo
                                </button>
                                {/* Botón Editar y Guardar cambios eliminados por redundancia */}
                                <button
                                    type="button"
                                    disabled={selectedIndex < 0 || servers.length === 0 || loadingList || deleting}
                                    title={servers.length === 0 ? "No hay servidores para eliminar" : (selectedIndex < 0 ? "Selecciona un servidor" : "Eliminar servidor")}
                                    onClick={async () => {
                                        if (selectedIndex < 0 || servers.length === 0) return;
                                        if (!servers[selectedIndex]) return;
                                        try {
                                            const deletingIndex = selectedIndex;
                                            const s = servers[deletingIndex];
                                            const label = s ? `${s.name?.trim() ? s.name : s.ip}:${s.port || "1433"}` : String(selectedIndex);
                                            const ok = window.confirm(`¿Seguro que deseas eliminar el servidor "${label}"? Esta acción no se puede deshacer.`);
                                            if (!ok) return;
                                            setDeleting(true);
                                            const res = await window.electronAPI?.deleteMSSQLServer?.(deletingIndex);
                                            console.log("Servidor eliminado:", res);
                                            // Mostrar banner breve y reiniciar tras 1s
                                            showBanner("Servidor eliminado");
                                            setTimeout(() => {
                                                try { void window.electronAPI?.restartApp?.(); } catch {}
                                            }, 1000);
                                            return;
                                        } catch (e) {
                                            console.error("Error al eliminar servidor:", e);
                                            setDeleting(false);
                                        }
                                    }}
                                    className="rounded bg-white/10 px-2 py-1 text-[12px] text-gray-200 hover:bg-white/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:opacity-50"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                        {banner && (
                            <div className="mb-2 text-[12px] text-green-400 pointer-events-none">{banner}</div>
                        )}
                        <div className="rounded border border-white/10 bg-[#1f1f1f] p-2">
                            {servers.length === 0 ? (
                                <p className="text-[12px] text-gray-400">No hay servidores guardados.</p>
                            ) : (
                                <>
                                    <select
                                        id="server-select"
                                        value={selectedIndex >= 0 ? String(selectedIndex) : ""}
                                        onChange={handleDropdownChange}
                                        className="w-full rounded border border-white/10 bg-[#1f1f1f] px-3 py-2 text-[14px] text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        {servers.map((s, i) => (
                                            <option key={`${s.ip}:${s.port}:${i}`} value={i}>
                                                {(s.name?.trim() ? s.name : s.ip) + `:${s.port || "1433"}`}
                                            </option>
                                        ))}
                                    </select>
                                </>
                            )}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="server-name" className="mb-1 block text-[13px] text-gray-300">
                            Nombre
                        </label>
                        <input
                            id="server-name"
                            type="text"
                            value={name}
                            onChange={(e) => { setName(e.target.value); setSaveError(null); }}
                            ref={nameInputRef}
                            disabled={!editing}
                            className="w-full rounded border border-white/10 bg-[#1f1f1f] px-3 py-2 text-[14px] text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="Servidor Principal"
                        />
                    </div>

                    <div>
                        <label htmlFor="server-ip" className="mb-1 block text-[13px] text-gray-300">
                            IP servidor
                        </label>
                        <input
                            id="server-ip"
                            type="text"
                            value={ip}
                            onChange={(e) => { setIp(e.target.value); setSaveError(null); }}
                            disabled={!editing}
                            className="w-full rounded border border-white/10 bg-[#1f1f1f] px-3 py-2 text-[14px] text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="192.168.1.10"
                        />
                    </div>

                    <div>
                        <label htmlFor="server-port" className="mb-1 block text-[13px] text-gray-300">
                            Puerto (port)
                        </label>
                        <input
                            id="server-port"
                            type="number"
                            min={0}
                            max={65535}
                            value={port}
                            onChange={(e) => setPort(e.target.value)}
                            disabled={!editing}
                            className="w-full rounded border border-white/10 bg-[#1f1f1f] px-3 py-2 text-[14px] text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="1433"
                        />
                    </div>

                    <div>
                        <label htmlFor="server-user" className="mb-1 block text-[13px] text-gray-300">
                            Usuario servidor
                        </label>
                        <input
                            id="server-user"
                            type="text"
                            value={user}
                            onChange={(e) => setUser(e.target.value)}
                            disabled={!editing}
                            className="w-full rounded border border-white/10 bg-[#1f1f1f] px-3 py-2 text-[14px] text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="admin"
                        />
                    </div>

                    <div>
                        <label htmlFor="server-password" className="mb-1 block text-[13px] text-gray-300">
                            Contraseña servidor
                        </label>
                        <input
                            id="server-password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={!editing}
                            className="w-full rounded border border-white/10 bg-[#1f1f1f] px-3 py-2 text-[14px] text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            placeholder="••••••"
                        />
                    </div>

                    {saveError && (
                        <div className="text-[12px] text-red-400">{saveError}</div>
                    )}

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleTestConnection}
                            disabled={testing || !ip || !port || !user || !password}
                            className="inline-flex h-8 items-center justify-center rounded bg-white/10 px-3 text-[12px] text-gray-200 hover:bg-white/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:opacity-50"
                        >
                            {testing ? "Probando..." : "Probar conexión"}
                        </button>
                        <button
                            type="button"
                            onClick={editing ? handleSave : () => setEditing(true)}
                            disabled={saving || (editing && (!name.trim() || !ip.trim()))}
                            aria-label={!editing ? "Editar" : "Guardar"}
                            title={!editing ? "Editar" : "Guardar"}
                            className="inline-flex h-8 w-8 items-center justify-center rounded bg-white/10 text-gray-200 hover:bg-white/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:opacity-50"
                        >
                            {saving ? (
                                <span className="text-lg">⏳</span>
                            ) : editing ? (
                                <span className="text-lg" role="img" aria-hidden={true}>
                                    💾
                                </span>
                            ) : (
                                <span className="text-lg" role="img" aria-hidden={true}>
                                    ✎
                                </span>
                            )}
                        </button>
                        {testMessage && (
                            <span className={`text-[12px] ${testOk ? "text-green-400" : "text-red-400"}`}>
                                {testMessage}
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="mt-2 inline-flex h-8 items-center justify-center rounded bg-white/10 px-3 text-[12px] text-gray-200 hover:bg-white/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}