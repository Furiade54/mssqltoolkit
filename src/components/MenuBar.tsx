import React from "react";
import AboutModal from "./AboutModal";

type DraggableStyle = React.CSSProperties & { WebkitAppRegion?: "drag" | "no-drag" };

export type MenuKey = "file" | "edit" | "view" | "help";

export type TopMenu = {
	key: MenuKey;
	label: string;
	ariaLabel?: string;
};

export type SubMenuItem = {
	id: string;
	label: string;
	kbd?: string;
	disabled?: boolean;
	separator?: boolean;
};

export const TOP_MENUS: TopMenu[] = [
	{ key: "file", label: "File", ariaLabel: "File menu" },
	{ key: "edit", label: "Edit", ariaLabel: "Edit menu" },
	{ key: "view", label: "View", ariaLabel: "View menu" },
	{ key: "help", label: "Help", ariaLabel: "Help menu" },
];

export const SUB_MENUS: Record<MenuKey, SubMenuItem[]> = {
	file: [
		{ id: "new-file", label: "New File", kbd: "Ctrl+N" },
		{ id: "new-window", label: "New Window" },
		{ id: "open-file", label: "Open File...", kbd: "Ctrl+O" },
		{ id: "open-folder", label: "Open Folder..." },
		{ id: "sep-1", label: "", separator: true },
		{ id: "save", label: "Save", kbd: "Ctrl+S" },
		{ id: "save-as", label: "Save As..." },
		{ id: "sep-2", label: "", separator: true },
		{ id: "exit", label: "Exit" },
	],
	edit: [
		{ id: "undo", label: "Undo", kbd: "Ctrl+Z" },
		{ id: "redo", label: "Redo", kbd: "Ctrl+Y" },
		{ id: "sep-1", label: "", separator: true },
		{ id: "cut", label: "Cut", kbd: "Ctrl+X" },
		{ id: "copy", label: "Copy", kbd: "Ctrl+C" },
		{ id: "paste", label: "Paste", kbd: "Ctrl+V" },
		{ id: "select-all", label: "Select All", kbd: "Ctrl+A" },
	],
	view: [
		{ id: "reload", label: "Reload", kbd: "Ctrl+R" },
		{ id: "force-reload", label: "Force Reload" },
		{ id: "toggle-devtools", label: "Toggle Developer Tools", kbd: "Ctrl+Shift+I" },
		{ id: "sep-1", label: "", separator: true },
		{ id: "toggle-fullscreen", label: "Toggle Full Screen", kbd: "F11" },
		{ id: "reset-zoom", label: "Reset Zoom", kbd: "Ctrl+0" },
		{ id: "zoom-in", label: "Zoom In", kbd: "Ctrl+=" },
		{ id: "zoom-out", label: "Zoom Out", kbd: "Ctrl-" },
	],
	help: [
		{ id: "docs", label: "Documentation" },
		{ id: "search-issues", label: "Search Issues" },
		{ id: "sep-1", label: "", separator: true },
		{ id: "check-updates", label: "Check for Updates" },
		{ id: "install-update", label: "Install Update" },
		{ id: "about", label: "About" },
	],
};

function useOutsideClick<T extends HTMLElement>(onOutside: () => void) {
	const ref = React.useRef<T | null>(null);
	React.useEffect(() => {
		function onDocClick(e: MouseEvent) {
			if (!ref.current) return;
			if (!ref.current.contains(e.target as Node)) onOutside();
		}
		document.addEventListener("mousedown", onDocClick);
		return () => document.removeEventListener("mousedown", onDocClick);
	}, [onOutside]);
	return ref;
}

function Kbd({ children }: { children: React.ReactNode }) {
	return (
		<span className="rounded border border-white/10 bg-white/5 px-1.5 py-[1px] text-[11px] text-gray-400">
			{children}
		</span>
	);
}

function SubMenu({
	items,
	onAction,
}: {
	items: SubMenuItem[];
	onAction: (item: SubMenuItem) => void;
}) {
	return (
		<div
			role="menu"
			className="absolute left-0 top-7 z-50 min-w-[200px] overflow-hidden rounded-md border border-black/50 bg-[#252525] shadow-xl shadow-black/40"
		>
			<ul className="py-1">
				{items.map((item) =>
					item.separator ? (
						<li key={item.id} aria-hidden="true" className="my-1 border-t border-white/10" />
					) : (
						<li key={item.id}>
							<button
								type="button"
								onClick={() => !item.disabled && onAction(item)}
								disabled={item.disabled}
								className={`group flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-[12px] leading-none ${
									item.disabled
										? "text-gray-500"
										: "text-gray-200 hover:bg-white/5 focus:outline-none focus-visible:bg-white/10"
								}`}
							>
								<span className="truncate">{item.label}</span>
								{item.kbd && <Kbd>{item.kbd}</Kbd>}
							</button>
						</li>
					),
				)}
			</ul>
		</div>
	);
}

function MenuButton({
	label,
	isOpen,
	onToggle,
	ariaLabel,
}: {
	label: string;
	isOpen: boolean;
	onToggle: () => void;
	ariaLabel?: string;
}) {
	return (
		<button
			type="button"
			role="menuitem"
			aria-expanded={isOpen}
			aria-haspopup="true"
			aria-label={ariaLabel ?? label}
			onClick={onToggle}
			className={`rounded px-2 text-[12px] leading-none h-6 mt-[2px] text-gray-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 ${
				isOpen ? "bg-white/10" : "hover:bg-white/5"
			}`}
            style={{ WebkitAppRegion: "no-drag" } as DraggableStyle}
		>
			{label}
		</button>
	);
}

function WindowControls({
	onMinimize,
	onMaximize,
	onClose,
}: {
	onMinimize?: () => void;
	onMaximize?: () => void;
	onClose?: () => void;
}) {
	return (
        <div className="flex items-center gap-1" style={{ WebkitAppRegion: "no-drag" } as DraggableStyle}>
            <button
				type="button"
				title="Minimize"
                onClick={onMinimize ?? (() => window.electronAPI?.minimize())}
				className="grid h-6 w-8 place-items-center rounded hover:bg-white/5 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
				aria-label="Minimize window"
			>
				<div className="h-[1px] w-3 bg-gray-300" />
			</button>
            <button
				type="button"
				title="Maximize"
                onClick={onMaximize ?? (() => window.electronAPI?.maximizeToggle())}
				className="grid h-6 w-8 place-items-center rounded hover:bg-white/5 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
				aria-label="Maximize window"
			>
				<div className="h-3 w-3 border border-gray-300" />
			</button>
            <button
				type="button"
				title="Close"
                onClick={onClose ?? (() => window.electronAPI?.close())}
				className="grid h-6 w-8 place-items-center rounded hover:bg-[#e81123] hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
				aria-label="Close window"
			>
				<div className="relative h-3 w-3">
					<div className="absolute left-1/2 top-1/2 h-3 w-[1px] -translate-x-1/2 -translate-y-1/2 rotate-45 bg-current" />
					<div className="absolute left-1/2 top-1/2 h-3 w-[1px] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-current" />
				</div>
			</button>
		</div>
	);
}

export function MenuBar({
	appTitle = "MSSQL ToolKit",
	menus = TOP_MENUS,
	subMenus = SUB_MENUS,
	user,
	onLogout,
}: {
	appTitle?: string;
	menus?: TopMenu[];
	subMenus?: Record<MenuKey, SubMenuItem[]>;
	user?: { username: string; avatarUrl?: string } | null;
	onLogout?: () => void;
}) {
	// Estado para Auto Update
	const [updateReady, setUpdateReady] = React.useState(false);
	const [updateStatus, setUpdateStatus] = React.useState<string | null>(null);
	const [updateProgress, setUpdateProgress] = React.useState<number | null>(null);

	React.useEffect(() => {
		const au = window.electronAPI?.autoUpdate;
		if (!au) return;

		const offChecking = au.onChecking?.(() => {
			setUpdateStatus("Checking for updates...");
			setUpdateProgress(null);
		});
		const offAvailable = au.onAvailable?.((info: any) => {
			setUpdateStatus(`Update available ${info?.version ?? ''}`.trim());
		});
		const offNotAvailable = au.onNotAvailable?.(() => {
			setUpdateStatus("No updates available");
			setUpdateProgress(null);
		});
		const offError = au.onError?.((err: any) => {
			setUpdateStatus("Update error");
			console.error("AutoUpdate error:", err);
		});
		const offProgress = au.onProgress?.((p: { percent?: number }) => {
			setUpdateStatus("Downloading update...");
			if (typeof p?.percent === 'number') setUpdateProgress(p.percent);
		});
		const offDownloaded = au.onDownloaded?.(() => {
			setUpdateStatus("Update ready to install");
			setUpdateProgress(100);
			setUpdateReady(true);
		});

		return () => {
			// Intentar desuscribir si las funciones devuelven un cleanup
			offChecking?.();
			offAvailable?.();
			offNotAvailable?.();
			offError?.();
			offProgress?.();
			offDownloaded?.();
		};
	}, []);

	const computedSubMenus = React.useMemo(() => {
		return {
			...subMenus,
			help: subMenus.help.map((i) => i.id === "install-update" ? { ...i, disabled: !updateReady } : i),
		};
	}, [subMenus, updateReady]);

	const [openMenu, setOpenMenu] = React.useState<MenuKey | null>(null);
	const menubarRef = useOutsideClick<HTMLDivElement>(() => {
		setOpenMenu(null);
		setUserMenuOpen(false);
	});
	const [aboutOpen, setAboutOpen] = React.useState(false);
	const [aboutInfo, setAboutInfo] = React.useState<{ version: string; createdAt: string; license: string } | null>(null);
	// Menú contextual del usuario
	const [userMenuOpen, setUserMenuOpen] = React.useState(false);

	React.useEffect(() => {
		function onKey(e: KeyboardEvent) {
			if (e.key === "Escape") setOpenMenu(null);
		}
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, []);

	function handleToggle(key: MenuKey) {
		setOpenMenu((prev) => (prev === key ? null : key));
	}

	function handleAction(item: SubMenuItem) {
		if (item.separator || item.disabled) return;
		console.log("Menu action:", item.id);
		
		// Implementar acciones del menú
		switch (item.id) {
			// File menu
			case "exit":
				window.electronAPI?.exit();
				break;
				
			// View menu
			case "reload":
                if (window.electronAPI?.reload) {
                    window.electronAPI.reload();
                } else {
                    window.location.reload();
                }
				break;
			case "force-reload":
                if (window.electronAPI?.forceReload) {
                    window.electronAPI.forceReload();
                } else {
                    window.location.reload();
                }
		case "toggle-devtools":
			window.electronAPI?.toggleDevTools?.();
			break;
			case "toggle-fullscreen":
				// Alternar entre pantalla completa
				if (document.fullscreenElement) {
					document.exitFullscreen();
				} else {
					document.documentElement.requestFullscreen();
				}
				break;
			case "reset-zoom":
				// Restablecer zoom
				document.body.style.zoom = "100%";
				break;
			case "zoom-in":
				// Aumentar zoom
				const currentZoomIn = parseFloat(document.body.style.zoom) || 100;
				document.body.style.zoom = `${currentZoomIn + 10}%`;
				break;
			case "zoom-out":
				// Disminuir zoom
				const currentZoomOut = parseFloat(document.body.style.zoom) || 100;
				document.body.style.zoom = `${Math.max(currentZoomOut - 10, 30)}%`;
				break;

			// Auto Update actions
			case "check-updates":
				window.electronAPI?.autoUpdate?.checkForUpdates?.();
				break;
			case "install-update":
				if (updateReady) {
					window.electronAPI?.autoUpdate?.quitAndInstall?.();
				} else {
					setUpdateStatus("No downloaded update to install");
				}
				break;

			// Window controls
			case "minimize-window":
				window.electronAPI?.minimize();
				break;
			case "maximize-window":
				window.electronAPI?.maximizeToggle();
				break;
			case "close-window":
				window.electronAPI?.close();
				break;
			
			case "about":
				(async () => {
					try {
						const meta = await window.electronAPI?.getMeta?.();
						if (meta) setAboutInfo({ version: meta.version, createdAt: meta.createdAt, license: meta.license });
						setAboutOpen(true);
					} catch (e) {
						console.error("Failed to get about meta:", e);
					}
				})();
				break;

			default:
				console.log(`Acción no implementada para: ${item.id}`);
		}

		setOpenMenu(null);
	}

	return (
		<div
			ref={menubarRef}
			className="relative flex h-8 items-center gap-1 border-b border-black/50 bg-[#2d2d2d] px-2 select-none"
			style={{ WebkitAppRegion: "drag" } as DraggableStyle }
			role="menubar"
			aria-label="Application menu bar"
		>
			<div className="mr-2 truncate text-[11px] leading-none text-gray-400" style={{ WebkitAppRegion: "no-drag" } as DraggableStyle }>
				{appTitle}
			</div>

			<nav className="relative flex items-stretch" style={{ WebkitAppRegion: "no-drag" } as DraggableStyle }>
				{menus.map((m) => {
					const isOpen = openMenu === (m.key as MenuKey);
					return (
						<div key={m.key} className="relative">
							<MenuButton
								label={m.label}
								isOpen={isOpen}
								onToggle={() => handleToggle(m.key as MenuKey)}
								ariaLabel={m.ariaLabel}
							/>
							{isOpen && <SubMenu items={computedSubMenus[m.key as MenuKey]} onAction={handleAction} />}
						</div>
					);
				})}
			</nav>

			<div className="mx-1 h-full flex-1" />

			{updateStatus && (
				<div className="mr-2 truncate text-[11px] leading-none text-gray-300" style={{ WebkitAppRegion: "no-drag" } as DraggableStyle }>
					{updateStatus}{typeof updateProgress === 'number' ? ` (${Math.round(updateProgress)}%)` : ""}
				</div>
			)}

			{user && (
				<div className="relative flex items-center gap-1" style={{ WebkitAppRegion: "no-drag" } as DraggableStyle}>
					<button
						type="button"
						title={`Usuario: ${user.username}`}
						aria-label={`Usuario: ${user.username}`}
						onClick={() => setUserMenuOpen((v) => !v)}
						className="grid h-6 w-8 place-items-center rounded hover:bg-white/5 ring-1 ring-white/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500"
					>
						{user.avatarUrl ? (
							<img src={user.avatarUrl} alt="avatar" className="h-5 w-5 rounded-full object-cover" />
						) : (
							<svg 
								className="h-5 w-5" 
								viewBox="0 0 24 24" 
								fill="none" 
								stroke="currentColor" 
								strokeWidth="2"
							>
								<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
								<circle cx="12" cy="7" r="4"/>
							</svg>
						)}
					</button>
					{userMenuOpen && (
						<div role="menu" className="absolute right-0 top-7 z-50 min-w-[200px] overflow-hidden rounded-md border border-black/50 bg-[#252525] shadow-xl shadow-black/40">
							<ul className="py-1">
								<li>
									<button type="button" className="group flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-[12px] leading-none text-gray-200 hover:bg-white/5 focus:outline-none focus-visible:bg-white/10" onClick={() => window.electronAPI?.autoUpdate?.checkForUpdates?.()}>Check for Updates...</button>
								</li>
								<li>
									<button type="button" className="group flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-[12px] leading-none text-gray-200 hover:bg-white/5 focus:outline-none focus-visible:bg-white/10" onClick={() => window.open('https://github.com/Furiade54/mssqltoolkit#readme', '_blank')}>Help Document</button>
								</li>
								<li>
									<button type="button" className="group flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-[12px] leading-none text-gray-200 hover:bg-white/5 focus:outline-none focus-visible:bg-white/10" onClick={() => window.open('https://github.com/Furiade54/mssqltoolkit/issues', '_blank')}>Report Issue</button>
								</li>
								<li>
									<button type="button" className="group flex w-full items-center justify-between gap-4 px-3 py-1.5 text-left text-[12px] leading-none text-gray-200 hover:bg-white/5 focus:outline-none focus-visible:bg-white/10" onClick={() => window.open('mailto:support@example.com')}>Contact Us</button>
								</li>
								<li aria-hidden="true" className="my-1 border-t border-white/10" />
								<li>
									<button type="button" className="w-full rounded bg-white/10 px-3 py-1.5 text-[12px] text-gray-200 hover:bg-white/20 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500" onClick={() => onLogout?.()}>Log Out</button>
								</li>
							</ul>
						</div>
					)}
				</div>
			)}

			<WindowControls />

			<AboutModal open={aboutOpen} info={aboutInfo} appTitle={appTitle} onClose={() => setAboutOpen(false)} />
		</div>
	);
}

export default MenuBar;


