/*
 * Child window management.
 */

import { createChildWindow } from "../../common/utils";

import Chart from "@activfinancial/time-series-chart";
import NewsViewer from "@activfinancial/news-viewer";
import OptionChain from "@activfinancial/option-chain";
import RecordViewer from "@activfinancial/record-viewer";

import { IClient } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

/** Union of all ACTIV WebComponent types. */
type WindowComponent = Chart | NewsViewer | OptionChain | RecordViewer;

/** Enum of window types. These must match the names in windowTypes/. */
export enum WindowType {
    newsViewer,
    optionChain,
    recordViewer,
    timeSeriesChart
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Info stored about an open window. */
export interface WindowInfo {
    /** The OpenFin window. */
    finWindow: fin.OpenFinWindow;

    /** The native window. */
    htmlWindow: Window;

    /** The ACTIV WebComponent running in the window. */
    component: WindowComponent;

    /** Function to update the symbol in the WebComponent. */
    updateSymbol: (symbol: string) => void;
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Per WindowType config. Function to update a window's symbol and default window options. */
const windowTypes = {
    [WindowType.newsViewer]: {
        updateSymbol: function(symbol: string, windowInfo: WindowInfo) {
            (windowInfo.component as NewsViewer).query = `symbol=${symbol}`;
            windowInfo.htmlWindow.document.title = `News for for ${symbol}`;
        },
        windowOptions: {
            defaultWidth: 1100,
            defaultHeight: 800
        }
    },
    [WindowType.optionChain]: {
        updateSymbol: function(symbol: string, windowInfo: WindowInfo) {
            (windowInfo.component as OptionChain).symbol = symbol;
            windowInfo.htmlWindow.document.title = `Options for ${symbol}`;
        },
        windowOptions: {
            defaultWidth: 1100,
            defaultHeight: 800
        }
    },
    [WindowType.recordViewer]: {
        updateSymbol: function(symbol: string, windowInfo: WindowInfo) {
            (windowInfo.component as RecordViewer).symbol = symbol;
            windowInfo.htmlWindow.document.title = `Record viewer for ${symbol}`;
        },
        windowOptions: {
            defaultWidth: 1100,
            defaultHeight: 800
        }
    },
    [WindowType.timeSeriesChart]: {
        updateSymbol: function(symbol: string, windowInfo: WindowInfo) {
            (windowInfo.component as Chart).symbol = symbol;
            windowInfo.htmlWindow.document.title = `Closing prices for ${symbol}`;
        },
        windowOptions: {
            defaultWidth: 800,
            defaultHeight: 600
        }
    }
};

// ---------------------------------------------------------------------------------------------------------------------------------

/** Type for set of key -> window info. */
interface WindowSet {
    [key: string]: WindowInfo;
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Tracker for app windows. */
export class WindowManager {
    private windowSet: WindowSet = {};
    private windowId: number = 0;

    constructor(private readonly childWindowOptions: fin.WindowOption) {}

    /**
     * Create a new window.
     *
     * @param windowType
     *
     * @returns Promise<WindowInfo>
     */
    async createWindow(windowType: WindowType) {
        const windowTypeInfo = windowTypes[windowType];
        const elementName = WindowType[windowType];
        const key = `${elementName}${++this.windowId}`;

        try {
            const { finWindow, promise } = createChildWindow({
                name: key,
                url: `${elementName}.html`,
                ...this.childWindowOptions,
                ...windowTypeInfo.windowOptions
            });

            // Wait for window to be created.
            await promise;

            // Get the ACTIV WebComponent from the html document.
            // All pages use the same id for the WebComponent.
            const htmlWindow = finWindow.getNativeWindow();
            const component = htmlWindow.document.querySelector("#cgApiComponent") as WindowComponent;

            // Create and store window info.
            const windowInfo = {
                finWindow,
                htmlWindow,
                component,
                updateSymbol: (symbol: string) => windowTypeInfo.updateSymbol(symbol, windowInfo)
            };

            finWindow.addEventListener("closed", () => delete this.windowSet[key]);
            this.windowSet[key] = windowInfo;

            return windowInfo;
        } catch (e) {
            alert(`Failed to create window due to ${e.reason}`);
            throw e;
        }
    }

    /** Pass a new Promise<Client> to all windows. */
    reconnectAllWindows(contentGatewayClientPromise: Promise<IClient>) {
        for (const key in this.windowSet) {
            this.windowSet[key].component.connect(contentGatewayClientPromise);
        }
    }
}
