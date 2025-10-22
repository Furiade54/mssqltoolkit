import React from "react";

export type QueryType = "SELECT" | "UPDATE" | "DELETE" | "INSERT" | "OTHER";

export type QueryItem = {
  id: string;
  title: string;
  description?: string;
  type: QueryType;
  sql: string;
  createdAt: string;
  tags?: string[];
};

export default function AddQueryModal({
  open,
  onClose,
  onSave,
  onUpdate,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSave?: (item: Omit<QueryItem, "id" | "createdAt">) => void;
  onUpdate?: (id: string, item: Omit<QueryItem, "id" | "createdAt">) => void;
  initial?: QueryItem | null;
}) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [type, setType] = React.useState<QueryType>("SELECT");
  const [sql, setSql] = React.useState("");
  const [tagsInput, setTagsInput] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title ?? "");
      setDescription(initial.description ?? "");
      setType(initial.type ?? "SELECT");
      setSql(initial.sql ?? "");
      setTagsInput((initial.tags ?? []).join(", "));
    } else {
      setTitle("");
      setDescription("");
      setType("SELECT");
      setSql("");
      setTagsInput("");
    }
  }, [open, initial]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    if (!title.trim() || !sql.trim()) return;

    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      type,
      sql: sql.trim(),
      tags,
    } satisfies Omit<QueryItem, "id" | "createdAt">;

    if (initial && onUpdate) {
      onUpdate(initial.id, payload);
    } else if (onSave) {
      onSave(payload);
    }
    onClose();
  }

  const isEdit = Boolean(initial);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 grid place-items-center bg-black/50"
      onClick={onClose}
      style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties & { WebkitAppRegion?: "drag" | "no-drag" }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-[520px] rounded-md border border-black/50 bg-[#2d2d2d] p-4 text-sm text-gray-200 shadow-xl"
      >
        <h2 className="mb-3 text-base font-semibold">{isEdit ? "Editar consulta" : "Nueva consulta"}</h2>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[12px] text-gray-400">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-white/10 bg-[#1f1f1f] px-2 py-1 text-gray-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
              placeholder="Consulta1"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-[12px] text-gray-400">Descripción</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded border border-white/10 bg-[#1f1f1f] px-2 py-1 text-gray-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
              placeholder="Consulta para buscar usuarios"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-[12px] text-gray-400">Tipo</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as QueryType)}
                className="w-full rounded border border-white/10 bg-[#1f1f1f] px-2 py-1 text-gray-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
              >
                <option value="SELECT">SELECT</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="INSERT">INSERT</option>
                <option value="OTHER">OTRA</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[12px] text-gray-400">Tags/Categoría</label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                className="w-full rounded border border-white/10 bg-[#1f1f1f] px-2 py-1 text-gray-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                placeholder="Usuarios, Seguridad"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[12px] text-gray-400">SQL</label>
            <textarea
              value={sql}
              onChange={(e) => setSql(e.target.value)}
              className="h-32 w-full resize-y rounded border border-white/10 bg-[#1f1f1f] px-2 py-1 font-mono text-[12px] text-gray-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
              placeholder="SELECT * FROM USERS.DBO.USUARIOS"
              required
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-white/10 px-3 py-1 text-gray-200 hover:bg-white/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded bg-blue-600/80 px-3 py-1 text-white hover:bg-blue-600 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
          >
            {isEdit ? "Actualizar" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}