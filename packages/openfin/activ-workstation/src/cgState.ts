/**
 * State of connection to CG.
 */
enum CgState {
    /** Disconnected and inactive. */
    disconnected,

    /** Connecting to CG. */
    connecting,

    /** Connected to CG. */
    connected,

    /** Failed to connect or connection broken. */
    error
}

export default CgState;
