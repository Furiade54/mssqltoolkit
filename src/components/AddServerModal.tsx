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
    }

    async function handleSave() {
        setSaving(true);
        try {
            await onSave({ name, ip, port, user, password });
            onClose();
        } finally {
            setSaving(false);
        }
    }

    function handleEdit(index: number) {
        setSelectedIndex(index);
        const s = servers[index];
        if (s) {
            setName(s.name || "");
            setIp(s.ip || "");
            setPort(s.port || "");
            setUser(s.user || "");
            setPassword(s.password || "");
            setTestMessage(null);
            setTestOk(null);
            setEditing(false); // al seleccionar, inicia en modo solo lectura
        }
    }

    async function handleUpdate() {
        if (selectedIndex < 0) return;
        setSaving(true);
        try {
            const res = await window.electronAPI?.updateMSSQLServer?.(selectedIndex, { name, ip, port, user, password });
            if (res?.ok) {
                await loadServers();
                setEditing(false);
            } else {
                console.error("Error al actualizar servidor:", res?.error);
            }
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(index: number) {
        const s = servers[index];
        const label = s?.name?.trim() || `${s?.ip || ""}:${s?.port || ""}`;
        const confirmed = window.confirm(`¿Eliminar servidor "${label}"? Esta acción no se puede deshacer.`);
        if (!confirmed) return;
        try {
            const res = await window.electronAPI?.deleteMSSQLServer?.(index);
            if (res?.ok) {
                await loadServers();
                if (selectedIndex === index) {
                    clearForm();
                }
            } else {
                console.error("Error al eliminar servidor:", res?.error);
            }
        } catch (e) {
            console.error("Error al eliminar servidor:", e);
        }
    }

    async function handleTestConnection() {
        setTesting(true);
        setTestMessage(null);
        setTestOk(null);
        try {
            const res = await window.electronAPI?.testMSSQLConnection?.({ ip, port, user, password });
            if (res?.ok) {
                setTestOk(true);
                setTestMessage("Conexión exitosa");
            } else {
                setTestOk(false);
                setTestMessage(`Error: ${res?.error ?? "desconocido"}`);
            }
        } catch (e) {
            setTestOk(false);
            setTestMessage(`Error: ${String((e as Error)?.message ?? e)}`);
        } finally {
            setTesting(false);
        }
    }

    async function handlePrimaryAction() {
        if (!editing) {
            // Pasar a modo edición
            setEditing(true);
            return;
        }
        // Modo edición activo: Guardar
        if (selectedIndex >= 0) {
            await handleUpdate();
        } else {
            await handleSave();
        }
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 grid place-items-center bg-black/50"
            style={{ WebkitAppRegion: "no-drag" } as DraggableStyle}
            onClick={onClose}
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
                                    onClick={clearForm}
                                    className="rounded bg-white/10 px-2 py-1 text-[12px] text-gray-200 hover:bg-white/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                                >
                                    Nuevo
                                </button>
                                <button
                                    type="button"
                                    onClick={() => selectedIndex >= 0 && handleDelete(selectedIndex)}
                                    disabled={selectedIndex < 0 || servers.length === 0}
                                    className="rounded bg-white/10 px-2 py-1 text-[12px] text-gray-200 hover:bg-white/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:opacity-50"
                                >
                                    Eliminar
                                </button>
                            </div>
                        </div>
                        <div className="rounded border border-white/10 bg-[#1f1f1f] p-2">
                            <select
                                className="w-full rounded border border-white/10 bg-[#1f1f1f] px-2 py-1 text-[14px] text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                value={selectedIndex >= 0 ? String(selectedIndex) : ""}
                                onChange={(e) => {
                                    const idx = Number(e.target.value);
                                    setSelectedIndex(Number.isNaN(idx) ? -1 : idx);
                                    if (!Number.isNaN(idx)) handleEdit(idx);
                                }}
                                disabled={loadingList || servers.length === 0}
                            >
                                {loadingList ? (
                                    <option value="">Cargando...</option>
                                ) : servers.length === 0 ? (
                                    <option value="">No hay servidores guardados</option>
                                ) : (
                                    <>
                                        <option value="" disabled>
                                            Selecciona un servidor
                                        </option>
                                        {servers.map((s, i) => (
                                            <option key={`${s.ip}:${s.port}:${i}`} value={i}>
                                                {(s.name?.trim() ? s.name : s.ip) + `:${s.port || "1433"}`}
                                            </option>
                                        ))}
                                    </>
                                )}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="server-name" className="mb-1 block text-[13px] text-gray-300">
                            Nombre Servidor
                        </label>
                        <input
                            id="server-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
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
                            onChange={(e) => setIp(e.target.value)}
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
                            placeholder="8080"
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
                </div>

                <div className="mt-4 flex justify-between gap-2">
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handleTestConnection}
                            disabled={testing}
                            className="rounded bg-white/10 px-3 py-1 text-gray-200 hover:bg-white/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:opacity-50"
                        >
                            {testing ? "Probando..." : "Test conexión"}
                        </button>
                        <button
                            type="button"
                            onClick={handlePrimaryAction}
                            disabled={saving}
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
                        className="rounded bg-white/10 px-3 py-1 text-gray-200 hover:bg-white/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                    >
                        Salir
                    </button>
                </div>
            </div>
        </div>
    );
}