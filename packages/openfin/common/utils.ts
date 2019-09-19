/*
 * Some utilities for use with OpenFin.
 */

import "openfin";

// ---------------------------------------------------------------------------------------------------------------------------------

/** Awaitable function to wait for OpenFin desktop to be ready. */
export function desktopReady() {
    return new Promise((resolve) => fin.desktop.main(resolve));
}

// ---------------------------------------------------------------------------------------------------------------------------------

/**
 * Awaitable function to create an OpenFin child window.
 *
 * @param   option fin.WindowOptions
 *
 * @returns { finWindow, promise }
 */
export function createChildWindow(options: fin.WindowOption) {
    let finWindow!: fin.OpenFinWindow;

    const promise = new Promise<fin.OpenFinWindow>((resolve, reject) => {
        finWindow = new fin.desktop.Window(
            options,
            () => /* successObj: { httpResponseCode: number } */ resolve(finWindow),
            (reason: string, errorObj: fin.NetworkErrorInfo) => reject({ reason, errorObj })
        );
    });

    return { finWindow, promise };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Awaitable function to get the current options for a window. */
export function getWindowOptions(finWindow: fin.OpenFinWindow) {
    return new Promise<fin.WindowOption>((resolve, reject) => finWindow.getOptions(resolve, reject));
}
