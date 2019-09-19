/*
 * ActivWorkstation main application entry point.
 */

import * as React from "react";
import ReactDOM from "react-dom";
import App from "./App";

import "index.scss";
import "@fortawesome/fontawesome-free/css/all.css";

import { domReady, isOpenFin } from "../../../common/utils";
import { desktopReady, getWindowOptions } from "../../common/utils";

import { version as appVersion } from "../package.json";

// ---------------------------------------------------------------------------------------------------------------------------------

// Main entry point.
(async function() {
    if (!isOpenFin) {
        alert("This is an OpenFin application and will not run in a browser.");
        return;
    }

    document.title += ` ${appVersion}`;

    //    addContextMenu(window);

    // Wait for DOM then OpenFin to be ready.
    await domReady(document);
    await desktopReady();

    const mainWindow = fin.desktop.Application.getCurrent().getWindow();
    const mainWindowOptions = await getWindowOptions(mainWindow);

    // Start main app.
    ReactDOM.render(
        <App mainWindowOptions={mainWindowOptions} mainWindow={mainWindow} />,
        mainWindow.getNativeWindow().document.getElementById("root")
    );

    // Show main window after initialization.
    mainWindow.show();

    // TODO if user reloads main window, child windows end up orphaned. I can't see an event that can be subscribed to
    // in order to capture reload requestes and close them...
    // I'm guessing a solution might be to have the initial app a window-less "sentinel" that launches the real main
    // app and monitors it for "reloaded" events?
})();
