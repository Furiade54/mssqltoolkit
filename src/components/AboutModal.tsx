import React from "react";

type DraggableStyle = React.CSSProperties & { WebkitAppRegion?: "drag" | "no-drag" };

export type AboutInfo = {
    version: string;
    createdAt: string;
    license: string;
};

export function AboutModal({
    open,
    info,
    appTitle,
    onClose,
}: {
    open: boolean;
    info: AboutInfo | null;
    appTitle: string;
    onClose: () => void;
}) {
    if (!open || !info) return null;
    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 grid place-items-center bg-black/50"
            style={{ WebkitAppRegion: "no-drag" } as DraggableStyle}
            onClick={onClose}
        >
            <div
                className="w-[360px] rounded-md border border-black/50 bg-[#2d2d2d] p-4 text-sm text-gray-200 shadow-xl"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="mb-2 text-base font-semibold">About {appTitle}</h2>
                <div className="space-y-1">
                    <div>
                        <span className="text-gray-400">Version:</span> {info.version}
                    </div>
                    <div>
                        <span className="text-gray-400">Created:</span> {info.createdAt}
                    </div>
                    <div>
                        <span className="text-gray-400">License:</span> {info.license}
                    </div>
                </div>
                <div className="mt-4 flex justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded bg-white/10 px-3 py-1 text-gray-200 hover:bg-white/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}

export default AboutModal;


