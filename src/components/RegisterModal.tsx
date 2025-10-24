import React from "react";

type DraggableStyle = React.CSSProperties & { WebkitAppRegion?: "drag" | "no-drag" };

export default function RegisterModal({
  open,
  onClose,
  serverIndex: initialServerIndex,
}: {
  open: boolean;
  onClose: () => void;
  serverIndex?: number;
}) {
  const [username, setUsername] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [nombre, setNombre] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [servers, setServers] = React.useState<Array<{ name: string; ip: string; port: string; user: string; password: string; createdAt?: string }>>([]);
  const [serverIndex, setServerIndex] = React.useState(initialServerIndex || 0);
  const [success, setSuccess] = React.useState<string | null>(null);
  const closeTimerRef = React.useRef<number | null>(null);

  function resetForm() {
    setUsername("");
    setPassword("");
    setConfirm("");
    setNombre("");
    setError(null);
    setSuccess(null);
  }

  const refreshServers = React.useCallback(async () => {
    try {
      const list = await window.electronAPI?.getMSSQLServers?.();
      setServers(list || []);
      if (list && list.length > 0) {
        setServerIndex(
          initialServerIndex !== undefined ? initialServerIndex : Math.max(0, list.length - 1)
        );
      } else {
        setServerIndex(0);
      }
    } catch (e) {
      console.error("Error al cargar servidores MSSQL:", e);
    }
  }, [initialServerIndex]);

  React.useEffect(() => {
    if (open) {
      refreshServers();
    }
  }, [open, refreshServers]);

  // Limpiar temporizador y estado si el modal se cierra
  React.useEffect(() => {
    if (!open) {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
      resetForm();
    }
  }, [open]);

  // Evitar cierre con tecla ESC mientras el modal esté abierto
  React.useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [open]);

  if (!open) return null;

  async function handleRegister() {
    setError(null);
    setSuccess(null);
    if (servers.length === 0) {
      setError("No hay servidores disponibles. Agregue un servidor primero.");
      return;
    }
    if (!username.trim() || !password.trim()) {
      setError("Usuario y clave son obligatorios");
      return;
    }
    if (password !== confirm) {
      setError("Las claves no coinciden");
      return;
    }
    setSaving(true);
    try {
      const res = await window.electronAPI?.registerMSSQLUser?.({
        username: username.trim(),
        password: password,
        nombre: nombre.trim() ? nombre.trim() : null,
        activo: true,
        encrypt: false,
        serverIndex,
      });
      if (res?.ok) {
        setSuccess("Usuario registrado exitosamente.");
        if (closeTimerRef.current) {
          clearTimeout(closeTimerRef.current);
        }
        closeTimerRef.current = window.setTimeout(() => {
          resetForm();
          onClose();
        }, 4000);
      } else {
        setError(res?.error || "No se pudo registrar usuario");
      }
    } catch (e) {
      setError(String((e as Error)?.message || e));
    } finally {
      setSaving(false);
    }
  }

  function handleCloseModal() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    resetForm();
    onClose();
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
        <h2 className="mb-3 text-base font-semibold">Registrar usuario</h2>

        <div className="space-y-3">
          <div>
            <label htmlFor="reg-server-select" className="mb-1 block text-[13px] text-gray-300">
              Servidor
            </label>
            <select
              id="reg-server-select"
              value={servers.length === 0 ? "" : String(serverIndex)}
              onChange={(e) => setServerIndex(Number(e.target.value))}
              className="w-full rounded border border-white/10 bg-[#1f1f1f] px-3 py-2 text-[14px] text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              disabled={servers.length === 0}
            >
              {servers.length === 0 ? (
                <option value="">No hay servidores disponibles</option>
              ) : (
                servers.map((s, i) => (
                  <option key={`${s.ip}:${s.port}:${i}`} value={i}>
                    {(s.name?.trim() ? s.name : s.ip) + `:${s.port || "1433"}`}
                  </option>
                ))
              )}
            </select>
            {servers.length === 0 && (
              <p className="mt-1 text-[11px] text-yellow-400">
                Agregue un servidor desde la pantalla de login antes de registrar usuarios.
              </p>
            )}
          </div>

          <div>
            <label htmlFor="reg-username" className="mb-1 block text-[13px] text-gray-300">
              Usuario
            </label>
            <input
              id="reg-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded border border-white/10 bg-[#1f1f1f] px-3 py-2 text-[14px] text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Código de usuario"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="reg-nombre" className="mb-1 block text-[13px] text-gray-300">
              Nombre (opcional)
            </label>
            <input
              id="reg-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full rounded border border-white/10 bg-[#1f1f1f] px-3 py-2 text-[14px] text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Nombre para mostrar"
            />
          </div>

          <div>
            <label htmlFor="reg-password" className="mb-1 block text-[13px] text-gray-300">
              Clave
            </label>
            <input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded border border-white/10 bg-[#1f1f1f] px-3 py-2 text-[14px] text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Clave"
            />
          </div>

          <div>
            <label htmlFor="reg-confirm" className="mb-1 block text-[13px] text-gray-300">
              Confirmar clave
            </label>
            <input
              id="reg-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full rounded border border-white/10 bg-[#1f1f1f] px-3 py-2 text-[14px] text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Repite la clave"
            />
          </div>

          {error && <p className="text-[12px] text-red-400">{error}</p>}

          <div className="mt-1 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleCloseModal}
              className="rounded bg-white/10 px-3 py-1.5 text-[12px] text-gray-200 hover:bg-white/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving || servers.length === 0}
              onClick={handleRegister}
              className="rounded bg-blue-500/80 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-blue-500 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:opacity-50"
            >
              {saving ? "Registrando..." : "Registrar"}
            </button>
          </div>
          {success && <p className="mt-2 text-[12px] text-green-400">{success}</p>}
        </div>
      </div>
    </div>
  );
}