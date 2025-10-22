import React from "react";
import AddServerModal from "./AddServerModal";

type LoginData = {
    username: string;
    password: string;
    remember: boolean;
};

export default function LoginForm({ onLogin }: { onLogin?: (data: LoginData) => void | Promise<void> }) {
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [remember, setRemember] = React.useState(true);
    const [showPassword, setShowPassword] = React.useState(false);
    const [errors, setErrors] = React.useState<{ username?: string; password?: string }>({});
    const [formError, setFormError] = React.useState<string | null>(null);
    const [submitting, setSubmitting] = React.useState(false);
    const [addServerOpen, setAddServerOpen] = React.useState(false);
    const [servers, setServers] = React.useState<Array<{ name: string; ip: string; port: string; user: string; password: string; createdAt?: string }>>([]);
    const [serverIndex, setServerIndex] = React.useState(0);

    const refreshServers = React.useCallback(async () => {
        try {
            const list = await window.electronAPI?.getMSSQLServers?.();
            setServers(list || []);
            if (list && list.length > 0) {
                setServerIndex(Math.max(0, list.length - 1));
            } else {
                setServerIndex(0);
            }
        } catch (e) {
            console.error("Error al cargar servidores MSSQL:", e);
        }
    }, []);

    React.useEffect(() => {
        refreshServers();
    }, [refreshServers]);

    function validate() {
        const e: { username?: string; password?: string } = {};
        if (!username.trim()) e.username = "Ingresa tu usuario";
        else if (username.length < 3) e.username = "Debe tener al menos 3 caracteres";
        if (!password.trim()) e.password = "Ingresa tu contraseña";
        else if (password.length < 4) e.password = "Debe tener al menos 4 caracteres";
        setErrors(e);
        return e;
    }

    async function handleSubmit(ev: React.FormEvent) {
        ev.preventDefault();
        const e = validate();
        if (Object.keys(e).length > 0) return;
        try {
            setSubmitting(true);
            setFormError(null);
            const idx = servers.length > 0 ? Math.min(Math.max(serverIndex, 0), servers.length - 1) : undefined;
            const res = await window.electronAPI?.validateMSSQLUser?.({ username, password, encrypt: false, serverIndex: idx });
            if (res?.ok) {
                await onLogin?.({ username, password, remember });
            } else {
                setFormError(res?.error || "Usuario o contraseña inválidos.");
            }
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="w-full max-w-[380px] rounded-md border border-black/50 bg-[#2d2d2d] p-4 shadow-xl">
            <h1 className="mb-3 text-center text-lg font-semibold">Iniciar sesión</h1>
            <form onSubmit={handleSubmit} className="space-y-3" noValidate>
                <div>
                    <label htmlFor="server-select" className="mb-1 block text-[13px] text-gray-300">
                        Servidor
                    </label>
                    <div className="flex items-center gap-2">
                        <select
                            id="server-select"
                            value={servers.length === 0 ? "" : String(serverIndex)}
                            onChange={(e) => setServerIndex(Number(e.target.value))}
                            className="w-full rounded border border-white/10 bg-[#1f1f1f] px-3 py-2 text-[14px] text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                            disabled={servers.length === 0}
                        >
                            {servers.map((s, i) => (
                                <option key={`${s.ip}:${s.port}:${i}`} value={i}>
                                    {(s.name?.trim() ? s.name : s.ip) + `:${s.port || "1433"}`}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            onClick={() => setAddServerOpen(true)}
                            className="whitespace-nowrap rounded bg-white/10 px-2 py-1 text-[12px] text-gray-200 hover:bg-white/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                        >
                            AddServer
                        </button>
                    </div>
                    {servers.length === 0 && (
                        <p className="mt-1 text-[12px] text-gray-400">No hay servidores guardados. Usa "AddServer" para agregar uno.</p>
                    )}
                </div>
                <div>
                    <label htmlFor="username" className="mb-1 block text-[13px] text-gray-300">
                        Usuario
                    </label>
                    <input
                        id="username"
                        type="text"
                        autoComplete="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full rounded border border-white/10 bg-[#1f1f1f] px-3 py-2 text-[14px] text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="LUIS43"
                    />
                    {errors.username && (
                        <p className="mt-1 text-[12px] text-red-400">{errors.username}</p>
                    )}
                </div>

                <div>
                    <label htmlFor="password" className="mb-1 block text-[13px] text-gray-300">
                        Contraseña
                    </label>
                    <div className="relative">
                        <input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full rounded border border-white/10 bg-[#1f1f1f] px-3 py-2 pr-20 text-[14px] text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                            placeholder="••••••"
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 rounded bg-white/10 px-2 py-1 text-[12px] text-gray-200 hover:bg-white/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                        >
                            {showPassword ? "Ocultar" : "Mostrar"}
                        </button>
                    </div>
                    {errors.password && (
                        <p className="mt-1 text-[12px] text-red-400">{errors.password}</p>
                    )}
                </div>

                <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-[13px] text-gray-300">
                        <input
                            type="checkbox"
                            checked={remember}
                            onChange={(e) => setRemember(e.target.checked)}
                            className="h-4 w-4 rounded border border-white/20 bg-[#1f1f1f] text-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        Recordarme
                    </label>
                    <div className="flex items-center gap-2">
                        <span className="cursor-not-allowed text-[12px] text-gray-500" title="No implementado">
                            ¿Olvidaste tu contraseña?
                        </span>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={submitting}
                    className="mt-1 w-full rounded bg-white/10 px-3 py-2 text-sm font-medium text-gray-200 hover:bg-white/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:opacity-50"
                >
                    {submitting ? "Ingresando..." : "Ingresar"}
                </button>
                {formError && (
                    <p className="mt-2 text-[12px] text-red-400">{formError}</p>
                )}
            </form>
            {addServerOpen && (
                <AddServerModal
                    open={addServerOpen}
                    onClose={() => {
                        setAddServerOpen(false);
                        // Refrescar lista por si hubo ediciones/eliminaciones dentro del modal
                        refreshServers();
                    }}
                    onSave={async (info) => {
                        try {
                            const res = await window.electronAPI?.saveMSSQLServer?.(info);
                            console.log("Servidor MSSQL guardado:", res);
                            const list = await window.electronAPI?.getMSSQLServers?.();
                            setServers(list || []);
                            if (list && list.length > 0) setServerIndex(list.length - 1);
                            setAddServerOpen(false);
                        } catch (e) {
                            console.error("Error al guardar servidor MSSQL:", e);
                        }
                    }}
                />
            )}
        </div>
    );
}