export {};

declare global {
	interface Window {
			electronAPI?: {
			exit: () => void;
			minimize: () => void;
			maximizeToggle: () => void;
			close: () => void;
			toggleDevTools: () => void;
            reload: () => void;
            forceReload: () => void;
			getVersion: () => Promise<string>;
			getMeta: () => Promise<{ version: string; license: string; createdAt: string }>;
			autoUpdate?: {
				checkForUpdates: () => Promise<any>;
				quitAndInstall: (options?: { isSilent?: boolean; isForceRunAfter?: boolean }) => Promise<any>;
				onChecking: (cb: (payload?: any) => void) => () => void;
				onAvailable: (cb: (info: any) => void) => () => void;
				onNotAvailable: (cb: (info?: any) => void) => () => void;
				onError: (cb: (err: any) => void) => () => void;
				onProgress: (cb: (p: { percent?: number } & any) => void) => () => void;
				onDownloaded: (cb: (info?: any) => void) => () => void;
			};
			saveMSSQLServer: (info: { name: string; ip: string; port: string; user: string; password: string }) => Promise<{ ok: boolean; error?: string }>;
			getMSSQLServers: () => Promise<Array<{ name: string; ip: string; port: string; user: string; password: string; createdAt?: string }>>;
			updateMSSQLServer: (index: number, info: { name: string; ip: string; port: string; user: string; password: string }) => Promise<{ ok: boolean; error?: string }>;
			deleteMSSQLServer: (index: number) => Promise<{ ok: boolean; error?: string }>;
			testMSSQLConnection: (info: { ip?: string; server?: string; port?: string | number; user?: string; password?: string }) => Promise<{ ok: boolean; error?: string }>;
            validateMSSQLUser: (creds: { username: string; password: string; encrypt?: boolean; serverIndex?: number; serverIp?: string }) => Promise<{ ok: boolean; error?: string }>;
            runMSSQLQuery: (payload: { sqlText: string; database?: string; encrypt?: boolean; serverIndex?: number; serverIp?: string }) => Promise<{ ok: boolean; rows?: any[]; columns?: string[]; count?: number; error?: string }>;
            saveMSSQLConsulta: (payload: { codigoAplicacion?: string; descripcion: string; consulta: string; reporteAsociado?: string | null; encrypt?: boolean; serverIndex?: number; serverIp?: string }) => Promise<{ ok: boolean; inserted?: boolean; updated?: boolean; error?: string }>;
		};
	}
}


