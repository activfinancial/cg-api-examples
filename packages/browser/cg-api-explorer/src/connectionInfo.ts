/** CG connection state. */
export enum ConnectionState {
    /** Inactive. */
    disconnected,

    /** Connecting to CG. */
    connecting,

    /** Connected to CG. */
    connected
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** State and optional string for error conditions. */
export interface ConnectionInfo {
    connectionState: ConnectionState;
    hostname: string;
    statusText?: string;
    isHistoryServiceAvailable: boolean;
    isNewsServerServiceAvailable: boolean;
    isSymbolDirectoryServiceAvailable: boolean;
    isDynamicConflationAvailable: boolean;
}
