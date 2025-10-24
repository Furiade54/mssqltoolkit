import React from "react";
import { MenuBar, TOP_MENUS } from "./components/MenuBar";
import LoginForm from "./components/LoginForm";
import Card from "./components/Card";
import ErrorBoundary from "./components/ErrorBoundary";
import { getAllCards as idbGetAllCards, saveCard as idbSaveCard, deleteCard as idbDeleteCard, StoredCard } from "./db";

type CardItem = {
    id: string;
    title: string;
    subtitle?: string;
    value?: React.ReactNode;
    icon?: React.ReactNode;
    // Campos para consultas MSSQL
    codigoAplicacion: string;
    descripcion: string;
    consulta: string;
    reporteAsociado?: string;
    // Per-server segregation
    serverIp?: string;
};

const App: React.FC = () => {
    const [user, setUser] = React.useState<{ username: string } | null>(null);
    const [currentServerIp, setCurrentServerIp] = React.useState<string | null>(null);

    const [cards, setCards] = React.useState<CardItem[]>([]);

    const [addOpen, setAddOpen] = React.useState(false);
    const [newTitle, setNewTitle] = React.useState("");
    const [newSubtitle, setNewSubtitle] = React.useState("");
    const [newValue, setNewValue] = React.useState("");
    const [newIcon, setNewIcon] = React.useState("");
    // Estados para campos de consulta MSSQL
    const [newDescripcion, setNewDescripcion] = React.useState("");
    const [newConsulta, setNewConsulta] = React.useState("");
    const [newReporteAsociado, setNewReporteAsociado] = React.useState("");
    const [savingAdd, setSavingAdd] = React.useState(false);
    const [saveError, setSaveError] = React.useState<string | null>(null);

    const [executingId, setExecutingId] = React.useState<string | null>(null);
    const [resultsOpen, setResultsOpen] = React.useState(false);
    const [resultsRows, setResultsRows] = React.useState<any[]>([]);
    const [resultsCols, setResultsCols] = React.useState<string[]>([]);
    const [resultsError, setResultsError] = React.useState<string | null>(null);

    // Controles de presentación de resultados
    const [compactFontPx, setCompactFontPx] = React.useState<number>(11);

    function isNumericLike(v: any): boolean {
        if (v === null || v === undefined) return false;
        if (typeof v === "number" && Number.isFinite(v)) return true;
        if (typeof v === "string") {
            const s = v.trim();
            if (!s) return false;
            return /^-?\d+(?:[\.,]\d+)?$/.test(s);
        }
        return false;
    }
    function isDateLike(v: any): boolean {
        if (v === null || v === undefined) return false;
        if (v instanceof Date && !isNaN(v.getTime())) return true;
        if (typeof v === "string") {
            const s = v.trim();
            // ISO-like or common SQL date formats
            return /^(\d{4}-\d{2}-\d{2})(?:[ T]\d{2}:\d{2}:\d{2}(?:\.\d{3})?)?$/.test(s) ||
                   /^(\d{2}\/\d{2}\/\d{4})$/.test(s);
        }
        return false;
    }

    const columnMeta = React.useMemo(() => {
        const meta: Record<string, { align: "left" | "right" | "center"; mono: boolean }> = {};
        resultsCols.forEach((col) => {
            const values = resultsRows.map((r) => r?.[col]).filter((v) => v !== null && v !== undefined);
            const allNumeric = values.length > 0 && values.every(isNumericLike);
            const allDates = values.length > 0 && values.every(isDateLike);
            const nameHintMono = /id|codigo|documento|nro|numero/i.test(col);
            if (allNumeric) meta[col] = { align: "right", mono: true };
            else if (allDates) meta[col] = { align: "center", mono: true };
            else meta[col] = { align: "left", mono: nameHintMono };
        });
        return meta;
    }, [resultsRows, resultsCols]);

    function alignmentClass(col: string): string {
        const a = columnMeta[col]?.align || "left";
        if (a === "right") return "text-right";
        if (a === "center") return "text-center";
        return "text-left";
    }
    function monoClass(col: string): string {
        return columnMeta[col]?.mono ? "font-mono" : "";
    }

    async function copyRowToClipboard(idx: number) {
        try {
            const row = resultsRows[idx];
            const header = ['#', ...resultsCols].join("\t");
            const line = [String(idx + 1), ...resultsCols.map((c) => String(row?.[c] ?? ""))].join("\t");
            await navigator.clipboard?.writeText(`${header}\n${line}`);
        } catch (e) {
            console.warn("Copy row failed:", e);
        }
    }
    async function copyCellToClipboard(value: any) {
        try {
            await navigator.clipboard?.writeText(String(value ?? ""));
        } catch (e) {
            console.warn("Copy cell failed:", e);
        }
    }

    function exportResultsToCSV() {
        const escape = (s: string) => '"' + s.replace(/"/g, '""') + '"';
        const header = resultsCols.map(escape).join(",");
        const lines = resultsRows.map((row) => resultsCols.map((c) => escape(String(row?.[c] ?? ""))).join(","));
        const csv = [header, ...lines].join("\r\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `consulta_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    }

    // Estados para edición
    const [editOpen, setEditOpen] = React.useState(false);
    const [editId, setEditId] = React.useState<string | null>(null);
    const [editTitle, setEditTitle] = React.useState("");
    const [editSubtitle, setEditSubtitle] = React.useState("");
    const [editIcon, setEditIcon] = React.useState("");
    const [editDescripcion, setEditDescripcion] = React.useState("");
    const [editConsulta, setEditConsulta] = React.useState("");
    const [editReporteAsociado, setEditReporteAsociado] = React.useState("");
    // Versión de la aplicación (para badge inferior derecho)
    const [appVersion, setAppVersion] = React.useState<string | null>(null);

    // Cargar versión de la app al montar (usa getMeta para asegurar versión de package.json)
    React.useEffect(() => {
        (async () => {
            try {
                const meta = await window.electronAPI?.getMeta?.();
                if (meta?.version) setAppVersion(meta.version);
            } catch {}
        })();
    }, []);

    const handleCardClick = (id: string) => {
        console.log("Card click:", id);
    };

    async function executeCardQuery(card: CardItem) {
        setResultsError(null);
        setExecutingId(card.id);
        try {
            const res = await window.electronAPI?.runMSSQLQuery?.({ sqlText: card.consulta, database: "mssqltoolkit", serverIp: currentServerIp ?? undefined });
            if (res?.ok) {
                setResultsRows(res.rows || []);
                setResultsCols(res.columns || []);
                setResultsOpen(true);
            } else {
                setResultsError(res?.error || "Error desconocido al ejecutar consulta");
                setResultsOpen(true);
            }
        } catch (e) {
            setResultsError(String((e as Error)?.message || e));
            setResultsOpen(true);
        } finally {
            setExecutingId(null);
        }
    }

    function closeResults() {
        setResultsOpen(false);
        setResultsRows([]);
        setResultsCols([]);
        setResultsError(null);
    }

    // Abrir modal de edición con datos de la tarjeta
    const handleCardEdit = (id: string) => {
        const card = cards.find((c) => c.id === id);
        if (!card) return;
        setEditId(card.id);
        setEditTitle(card.title || "");
        setEditSubtitle(typeof card.subtitle === "string" ? card.subtitle : "");
        setEditIcon(typeof card.icon === "string" ? (card.icon as string) : "");
        setEditDescripcion(card.descripcion || "");
        setEditConsulta(card.consulta || "");
        setEditReporteAsociado(card.reporteAsociado || "");
        setEditOpen(true);
    };

    function openAdd() {
        setNewTitle("");
        setNewSubtitle("");
        setNewValue("");
        setNewIcon("");
        setSaveError(null);
        setAddOpen(true);
    }

    function cancelAdd() {
        setAddOpen(false);
        setNewTitle("");
        setNewSubtitle("");
        setNewValue("");
        setNewIcon("");
        setNewDescripcion("");
        setNewConsulta("");
        setNewReporteAsociado("");
        setSaveError(null);
    }

    React.useEffect(() => {
        (async () => {
            try {
                const stored = await idbGetAllCards();
                // Filter by active server and usuario logueado
                const filtered = (currentServerIp && user ? stored.filter((c) => c.serverIp === currentServerIp && c.codigoUsuario === user.username) : []) as StoredCard[];
                // Map StoredCard -> CardItem shape expected by UI
                const cardsFromDB = filtered.map((c) => ({
                    id: c.id,
                    title: c.title,
                    subtitle: c.subtitle,
                    value: c.value, // stored as string, UI accepts ReactNode
                    icon: c.icon,
                    codigoAplicacion: c.codigoAplicacion,
                    descripcion: c.descripcion,
                    consulta: c.consulta,
                    reporteAsociado: c.reporteAsociado,
                    serverIp: c.serverIp,
                }));
                setCards(cardsFromDB);
            } catch (e) {
                console.error("IndexedDB: error cargando tarjetas", e);
            }
        })();
    }, [currentServerIp, user]);

    async function saveAdd() {
        if (!newTitle.trim() || !newDescripcion.trim() || !newConsulta.trim()) return;
        setSaveError(null);
        // Validar disponibilidad de Electron API (en navegador puro no existe)
        if (!window.electronAPI?.saveMSSQLConsulta) {
            setSaveError("Esta acción requiere Electron. Ejecuta 'npm run electron:dev'.");
            return;
        }
        setSavingAdd(true);
        try {
            const payload = {
                codigoAplicacion: "8",
                descripcion: newDescripcion.trim(),
                consulta: newConsulta.trim(),
                reporteAsociado: newReporteAsociado.trim() ? newReporteAsociado.trim() : null,
            };
            const res = await window.electronAPI?.saveMSSQLConsulta?.(payload);
            if (!res?.ok) {
                console.error("Error guardando consulta MSSQL:", res?.error);
                setSaveError(res?.error || "No se pudo guardar la consulta.");
                setSavingAdd(false);
                return;
            }
            const id = `${Date.now()}`;
            setCards((prev) => [
                ...prev,
                {
                    id,
                    title: newTitle.trim(),
                    subtitle: newSubtitle.trim() || undefined,
                    value: newValue.trim() || undefined,
                    icon: newIcon.trim() || undefined,
                    codigoAplicacion: "8",
                    descripcion: newDescripcion.trim(),
                    consulta: newConsulta.trim(),
                    reporteAsociado: newReporteAsociado.trim() || undefined,
                },
            ]);
            try {
                const toStore: StoredCard = {
                    id,
                    title: newTitle.trim(),
                    subtitle: newSubtitle.trim() || undefined,
                    value: newValue.trim() || undefined,
                    icon: newIcon.trim() || undefined,
                    codigoAplicacion: "8",
                    descripcion: newDescripcion.trim(),
                    consulta: newConsulta.trim(),
                    reporteAsociado: newReporteAsociado.trim() || undefined,
                    serverIp: currentServerIp ?? undefined,
                    codigoUsuario: user?.username,
                };
                await idbSaveCard(toStore);
            } catch (e) {
                console.error("IndexedDB: error guardando tarjeta", e);
            }
            setAddOpen(false);
        } catch (e) {
            console.error("Excepción guardando consulta MSSQL:", e);
            setSaveError(String((e as Error)?.message || e));
        } finally {
            setSavingAdd(false);
        }
    }

    async function saveEdit() {
        if (!editId) return;
        if (!editTitle.trim() || !editDescripcion.trim() || !editConsulta.trim()) return;
        const updated: CardItem = {
            id: editId,
            title: editTitle.trim(),
            subtitle: editSubtitle.trim() || undefined,
            value: undefined,
            icon: editIcon.trim() || undefined,
            codigoAplicacion: "8",
            descripcion: editDescripcion.trim(),
            consulta: editConsulta.trim(),
            reporteAsociado: editReporteAsociado.trim() || undefined,
        };
        setCards((prev) => prev.map((c) => (c.id === editId ? updated : c)));
        try {
            const toStore: StoredCard = { ...updated, serverIp: currentServerIp ?? undefined, codigoUsuario: user?.username } as StoredCard;
            await idbSaveCard(toStore);
        } catch (e) {
            console.error("IndexedDB: error actualizando tarjeta", e);
        }
        setEditOpen(false);
        setEditId(null);
    }

    function cancelEdit() {
        setEditOpen(false);
        setEditId(null);
    }

    async function handleCardDelete(card: CardItem) {
        const ok = window.confirm(`¿Eliminar la consulta "${card.title}"?`);
        if (!ok) return;
        setCards((prev) => prev.filter((c) => c.id !== card.id));
        try {
            await idbDeleteCard(card.id);
        } catch (e) {
            console.error("IndexedDB: error eliminando tarjeta", e);
        }
    }

    return (
        <div className="h-screen w-screen overflow-hidden bg-[#1e1e1e] text-gray-200 antialiased">
            <ErrorBoundary fallback={<div className="relative flex h-8 items-center gap-1 border-b border-black/50 bg-[#2d2d2d] px-2 select-none text-[11px] text-red-400">Menú no disponible por error.</div>}> 
                <MenuBar menus={user ? TOP_MENUS : []} user={user} onLogout={() => { setUser(null); setCurrentServerIp(null); setCards([]); }} />
            </ErrorBoundary>

            <main className="pt-0">
                {!user ? (
                    <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 2rem)' }}>
                        <ErrorBoundary fallback={
                            <div className="grid place-items-center rounded border border-white/10 bg-[#2a2a2a] p-4">
                                <div className="text-red-400">Login no disponible por error.</div>
                                <button
                                    type="button"
                                    onClick={() => { setUser({ username: "test" }); setCurrentServerIp(null); }}
                                    className="mt-3 rounded bg-blue-600/80 px-3 py-1 text-white hover:bg-blue-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                                >
                                    Continuar sin login
                                </button>
                            </div>
                        }>
                            <LoginForm onLogin={(data) => { setUser({ username: data.username }); setCurrentServerIp(data.serverIp ?? null); }} />
                        </ErrorBoundary>
                    </div>
                ) : (
                    <div className="mx-auto max-w-6xl px-4">
                        <>
                            <div className="mb-4 flex items-center justify-start">
                                <h1 className="text-xl font-semibold">Bienvenido{user?.username ? `, ${user.username}` : ""}</h1>
                                {/* Botón de crear nueva consulta eliminado por considerarse innecesario */}
                            </div>
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                                {/* Botón tipo tarjeta para agregar */}
                                <Card title="" icon="" variant="detailed" onClick={openAdd}>
                                    <div className="grid place-items-center h-20">
                                        <span className="text-3xl text-gray-400">+</span>
                                    </div>
                                </Card>

                                {cards.map((card) => (
                                    <Card
                                        key={card.id}
                                        title={card.title}
                                        subtitle={card.descripcion}
                                        value={
                                            <div className="space-y-1">
                                                <div className="text-xs text-gray-500">Código App: {card.codigoAplicacion}</div>
                                                {card.reporteAsociado && (
                                                    <div className="text-xs text-blue-600">Reporte: {card.reporteAsociado}</div>
                                                )}
                                                <div className="text-xs text-gray-400 font-mono bg-gray-100 p-1 rounded truncate">
                                                    {card.consulta.length > 50 ? `${card.consulta.substring(0, 50)}...` : card.consulta}
                                                </div>
                                            </div>
                                        }
                                        icon={card.icon || "🗃️"}
                                        variant="detailed"
                                        onClick={() => handleCardClick(card.id)}
                                        onEdit={() => handleCardEdit(card.id)}
                                    >
                                        <div className="mt-2 flex items-center justify-between gap-2">
                                            {card.value ? <div className="h-10" /> : <div className="h-10 rounded bg-white/5 w-1/2" />}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => executeCardQuery(card)}
                                                    className="rounded bg-blue-600/80 px-2 py-1 text-[12px] text-white hover:bg-blue-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 disabled:opacity-50"
                                                    disabled={executingId === card.id}
                                                >
                                                    {executingId === card.id ? "Ejecutando..." : "Ejecutar consulta"}
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleCardDelete(card)}
                                                    className="rounded bg-red-600/80 px-2 py-1 text-[12px] text-white hover:bg-red-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
                                                >
                                                    Eliminar
                                                </button>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>

                            {/* Modal para crear nueva consulta MSSQL */}
                            {addOpen && (
                                <div className="fixed inset-0 z-50 grid place-items-center bg-black/60">
                                    <div className="w-[520px] max-h-[90vh] overflow-y-auto rounded-md border border-white/10 bg-[#1f1f1f] p-4 shadow-xl">
                                        <h3 className="text-lg font-semibold">Nueva Consulta MSSQL</h3>
                                        <div className="mt-3 space-y-3">
                                            <div>
                                                <label className="mb-1 block text-[13px] text-gray-300">Título *</label>
                                                <input className="w-full rounded border border-white/10 bg-[#2a2a2a] px-3 py-2 text-[14px] text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Nombre de la consulta" />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-[13px] text-gray-300">Descripción *</label>
                                                <input className="w-full rounded border border-white/10 bg-[#2a2a2a] px-3 py-2 text-[14px] text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500" value={newDescripcion} onChange={(e) => setNewDescripcion(e.target.value)} placeholder="Breve descripción de la consulta" maxLength={50} />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-[13px] text-gray-300">Consulta SQL *</label>
                                                <textarea className="w-full rounded border border-white/10 bg-[#2a2a2a] px-3 py-2 text-[14px] text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 h-24 resize-none" value={newConsulta} onChange={(e) => setNewConsulta(e.target.value)} placeholder="SELECT * FROM DatabaseName.dbo.TableName WHERE Column = 'something'" />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-[13px] text-gray-300">Reporte Asociado</label>
                                                <input className="w-full rounded border border-white/10 bg-[#2a2a2a] px-3 py-2 text-[14px] text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500" value={newReporteAsociado} onChange={(e) => setNewReporteAsociado(e.target.value)} placeholder="Reporte asociado (opcional)" />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-[13px] text-gray-300">Código de Aplicación</label>
                                                <input className="w-full rounded border border-white/10 bg-[#2a2a2a] px-3 py-2 text-[14px] text-gray-400" value="8" disabled />
                                                <p className="text-xs text-gray-500 mt-1">Valor fijo para esta aplicación</p>
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-[13px] text-gray-300">Subtítulo</label>
                                                <input className="w-full rounded border border-white/10 bg-[#2a2a2a] px-3 py-2 text-[14px] text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500" value={newSubtitle} onChange={(e) => setNewSubtitle(e.target.value)} placeholder="Subtítulo para la tarjeta (opcional)" />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-[13px] text-gray-300">Icono</label>
                                                <input className="w-full rounded border border-white/10 bg-[#2a2a2a] px-3 py-2 text-[14px] text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500" value={newIcon} onChange={(e) => setNewIcon(e.target.value)} placeholder="Icono para la tarjeta (opcional)" />
                                            </div>
                                            {saveError && (
                                                <div className="text-xs text-red-400">{saveError}</div>
                                            )}
                                        </div>
                                        <div className="mt-4 flex justify-end gap-2">
                                            <button type="button" onClick={cancelAdd} className="rounded bg-white/10 px-3 py-1.5 text-sm text-gray-200 hover:bg-white/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500">Cancelar</button>
                                            <button type="button" onClick={saveAdd} className="rounded bg-blue-600/80 px-3 py-1.5 text-sm text-white hover:bg-blue-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500" disabled={!newTitle.trim() || !newDescripcion.trim() || !newConsulta.trim() || savingAdd}>{savingAdd ? "Guardando..." : "Guardar Consulta"}</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Modal de edición */}
                            {editOpen && (
                                <div className="fixed inset-0 z-50 grid place-items-center bg-black/60">
                                    <div className="w-[520px] max-h-[90vh] overflow-y-auto rounded-md border border-white/10 bg-[#1f1f1f] p-4 shadow-xl">
                                        <h3 className="text-lg font-semibold">Editar Consulta MSSQL</h3>
                                        <div className="mt-3 space-y-3">
                                            <div>
                                                <label className="mb-1 block text-[13px] text-gray-300">Título *</label>
                                                <input className="w-full rounded border border-white/10 bg-[#2a2a2a] px-3 py-2 text-[14px] text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-[13px] text-gray-300">Descripción *</label>
                                                <input className="w-full rounded border border-white/10 bg-[#2a2a2a] px-3 py-2 text-[14px] text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500" value={editDescripcion} onChange={(e) => setEditDescripcion(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-[13px] text-gray-300">Consulta SQL *</label>
                                                <textarea className="w-full rounded border border-white/10 bg-[#2a2a2a] px-3 py-2 text-[14px] text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 h-24 resize-none" value={editConsulta} onChange={(e) => setEditConsulta(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-[13px] text-gray-300">Reporte Asociado</label>
                                                <input className="w-full rounded border border-white/10 bg-[#2a2a2a] px-3 py-2 text-[14px] text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500" value={editReporteAsociado} onChange={(e) => setEditReporteAsociado(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-[13px] text-gray-300">Subtítulo</label>
                                                <input className="w-full rounded border border-white/10 bg-[#2a2a2a] px-3 py-2 text-[14px] text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500" value={editSubtitle} onChange={(e) => setEditSubtitle(e.target.value)} />
                                            </div>
                                            <div>
                                                <label className="mb-1 block text-[13px] text-gray-300">Icono</label>
                                                <input className="w-full rounded border border-white/10 bg-[#2a2a2a] px-3 py-2 text-[14px] text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500" value={editIcon} onChange={(e) => setEditIcon(e.target.value)} />
                                            </div>
                                        </div>
                                        <div className="mt-4 flex justify-end gap-2">
                                            <button type="button" onClick={cancelEdit} className="rounded bg-white/10 px-3 py-1.5 text-sm text-gray-200 hover:bg-white/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500">Cancelar</button>
                                            <button type="button" onClick={saveEdit} className="rounded bg-blue-600/80 px-3 py-1.5 text-sm text-white hover:bg-blue-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500" disabled={!editTitle.trim() || !editDescripcion.trim() || !editConsulta.trim()}>Guardar cambios</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Modal de resultados de consulta */}
                            {resultsOpen && (
                                <div className="fixed inset-0 z-50 grid place-items-center bg-black/60">
                                    <div className="w-[96vw] max-w-[96vw] max-h-[90vh] overflow-y-auto rounded-md border border-white/10 bg-[#1f1f1f] p-4 shadow-xl">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-lg font-semibold">Resultados de la consulta</h3>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1">
                                                    <button type="button" className="rounded bg-white/10 px-2 py-1 text-[11px] text-gray-200 hover:bg-white/20" onClick={() => setCompactFontPx((v) => Math.max(10, v - 1))}>A-</button>
                                                    <span className="text-[11px] text-gray-400">{compactFontPx}px</span>
                                                    <button type="button" className="rounded bg-white/10 px-2 py-1 text-[11px] text-gray-200 hover:bg-white/20" onClick={() => setCompactFontPx((v) => Math.min(12, v + 1))}>A+</button>
                                                </div>
                                                <button type="button" onClick={exportResultsToCSV} className="rounded bg-blue-600/80 px-2 py-1 text-[12px] text-white hover:bg-blue-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500">Exportar CSV</button>
                                                <button type="button" onClick={closeResults} className="rounded bg-white/10 px-2 py-1 text-[12px] text-gray-200 hover:bg-white/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500">Cerrar</button>
                                            </div>
                                        </div>

                                        {resultsError ? (
                                            <div className="mt-3 rounded bg-red-500/10 p-3 text-red-400">{resultsError}</div>
                                        ) : (
                                            <>
                                                <div className="mt-3 text-sm text-gray-300">
                                                    {resultsRows.length === 0 ? (
                                                        <div className="rounded border border-white/10 bg-[#2a2a2a] p-3">No hay registros.</div>
                                                    ) : (
                                                         <>
                                                             <div className="overflow-auto rounded border border-white/10 max-h-[70vh]" style={{ fontSize: `${compactFontPx}px` }}>
                                                                 <table className="min-w-full border-collapse leading-tight">
                                                                <thead>
                                                                    <tr>
                                                                        <th className="sticky top-0 z-10 border border-white/10 bg-[#262626] px-1 py-[2px] text-left font-semibold whitespace-nowrap">#</th>
                                                                        {resultsCols.map((col) => (
                                                                            <th
                                                                                key={col}
                                                                                className="sticky top-0 z-10 border border-white/10 bg-[#262626] px-1 py-[2px] text-left font-semibold whitespace-nowrap"
                                                                            >
                                                                                {col}
                                                                            </th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {resultsRows.map((row, idx) => (
                                                                        <tr key={idx} className="odd:bg-white/0 even:bg-white/5">
                                                                            <td className="border border-white/10 px-1 py-[2px] text-right whitespace-nowrap">
                                                                                <button type="button" className="rounded bg-white/10 px-1 py-[1px] text-[10px] text-gray-200 hover:bg-white/20" onClick={() => copyRowToClipboard(idx)} title="Copiar fila (incluye encabezados)">📋</button>
                                                                                <span className="ml-1 text-gray-400">{idx + 1}</span>
                                                                            </td>
                                                                            {resultsCols.map((col) => (
                                                                                <td
                                                                                    key={col}
                                                                                    className={`border border-white/10 px-1 py-[2px] whitespace-nowrap ${alignmentClass(col)} ${monoClass(col)}`}
                                                                                    title={String(row[col] ?? "")}
                                                                                    onDoubleClick={() => copyCellToClipboard(row[col])}
                                                                                >
                                                                                    {String(row[col] ?? "")}
                                                                                </td>
                                                                            ))}
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        <div className="mt-2 text-[11px] text-gray-400">
                                                            {resultsRows.length} filas • {resultsCols.length} columnas
                                                        </div>
                                                    </>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            )}
                        </>
                    </div>
                )}
            </main>
            {/* Badge de versión en esquina inferior derecha */}
            {appVersion && (
                <div className="fixed bottom-2 right-2 text-white/20 text-[12px] pointer-events-none select-none">
                    v{appVersion}
                </div>
            )}
        </div>
    );
};

export default App;


