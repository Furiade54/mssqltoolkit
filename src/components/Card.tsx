import React from "react";

export type CardProps = {
  title: string;
  value?: React.ReactNode;
  subtitle?: string;
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  variant?: "compact" | "detailed";
  typeLabel?: string;
  onClick?: () => void;
  onEdit?: () => void;
};

export default function Card({
  title,
  value,
  subtitle,
  icon,
  className,
  children,
  variant = "detailed",
  typeLabel,
  onClick,
  onEdit,
}: CardProps) {
  const isCompact = variant === "compact";

  return (
    <div
      className={`relative rounded border border-white/10 bg-[#2f2f2f] p-3 text-gray-200 ${className ?? ""} ${onClick ? "cursor-pointer" : ""}`}
      onClick={onClick}
    >
      {/* Edit button (top-right) */}
      {onEdit && (
        <button
          type="button"
          aria-label="Editar"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded text-gray-300 hover:bg-white/10 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
          title="Editar"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zm2.92 2.83H5v-0.92l9.06-9.06 0.92 0.92L5.92 20.08zM20.71 7.04a1.003 1.003 0 0 0 0-1.42l-2.34-2.34a1.003 1.003 0 0 0-1.42 0l-1.83 1.83 3.75 3.75 1.84-1.82z" />
          </svg>
        </button>
      )}

      {isCompact ? (
        <div className="grid min-h-[120px] place-items-center gap-1">
          <p className="text-sm text-gray-200 text-center">{title}</p>
          {typeLabel && <p className="text-[12px] text-gray-400 text-center">{typeLabel}</p>}
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[12px] text-gray-400">{title}</p>
              {subtitle && <p className="text-[12px] text-gray-500">{subtitle}</p>}
            </div>
            <div className="grid h-8 w-8 place-items-center rounded bg-white/5 text-gray-300">
              {icon ?? "📊"}
            </div>
          </div>
          <div className="mt-3 rounded bg-white/5 p-3">
            {children ?? <p className="text-xl font-semibold">{value}</p>}
          </div>
        </>
      )}
    </div>
  );
}