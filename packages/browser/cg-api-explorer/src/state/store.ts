/*
 * Redux store.
 */

import { createStore, combineReducers } from "redux";
import { encode as encodeBase64Url, decode as decodeBase64Url } from "base64-url";
import copyToClipboard from "clipboard-copy";

import { ActionType } from "./actions/actionType";
import { State as RootState, reducer as rootReducer } from "./reducers/rootReducer";
import { State as OutputContainerState, reducer as outputContainerReducer } from "./reducers/outputContainerReducer";
import {
    State as SubscriptionManagementState,
    reducer as SubscriptionManagementReducer
} from "./reducers/subscriptionManagementReducer";
import {
    State as SnapshotsAndStreamingState,
    reducer as snapshotsAndStreamingReducer
} from "./reducers/snapshotsAndStreamingReducer";
import { State as SymbolDirectoryState, reducer as symbolDirectoryReducer } from "./reducers/symbolDirectoryReducer";
import { State as TimeSeriesState, reducer as timeSeriesReducer } from "./reducers/timeSeriesReducer";
import { State as NewsState, reducer as newsReducer } from "./reducers/newsReducer";
import { State as MetaDataState, reducer as metaDataReducer } from "./reducers/metaDataReducer";

// ---------------------------------------------------------------------------------------------------------------------------------

/** Application state. */
export interface AppState {
    root: RootState;
    outputContainer: OutputContainerState;
    subscriptionManagement: SubscriptionManagementState;
    snapshotsAndStreaming: SnapshotsAndStreamingState;
    symbolDirectory: SymbolDirectoryState;
    timeSeries: TimeSeriesState;
    news: NewsState;
    metaData: MetaDataState;
}

const reducer = combineReducers({
    root: rootReducer,
    outputContainer: outputContainerReducer,
    subscriptionManagement: SubscriptionManagementReducer,
    snapshotsAndStreaming: snapshotsAndStreamingReducer,
    symbolDirectory: symbolDirectoryReducer,
    timeSeries: timeSeriesReducer,
    news: newsReducer,
    metaData: metaDataReducer
});

// ---------------------------------------------------------------------------------------------------------------------------------

const urlStateKey = "state";

/** Save state to clipboard. */
export function saveStateToClipboard() {
    const state = store.getState();

    // Pick out the state we're interested in.
    const stateToEncode = JSON.stringify({
        root: { url: state.root.url },
        snapshotsAndStreaming: state.snapshotsAndStreaming,
        symbolDirectory: state.symbolDirectory,
        timeSeries: state.timeSeries,
        news: state.news,
        metaData: state.metaData
    });

    // Note using base64-url to avoid issues with special chars in the base64.
    const encodedState = encodeBase64Url(stateToEncode);
    const url = `${document.location.origin}${document.location.pathname}?${urlStateKey}=${encodedState}`;

    copyToClipboard(url);
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Initial state from URL. */
function initialState() {
    // Call the root reducer to get a complete initial state tree.
    const initialState = reducer(undefined, { type: ActionType.other });

    // See if any state to set from the URL.
    const url = new URL(document.location.toString());
    const urlSearchParams = new URLSearchParams(url.search);
    const encodedState = urlSearchParams.get(urlStateKey);
    let savedState: Partial<AppState> = {};

    if (encodedState != null) {
        // Note using base64-url to avoid issues with special chars in the base64.
        savedState = JSON.parse(decodeBase64Url(encodedState)) || {};
    }

    // Helper to update a state sub-tree.
    function mergeState<K extends keyof AppState>(key: K) {
        initialState[key] = {
            ...initialState[key],
            ...savedState[key]
        };
    }

    // TODO I can't get ts-transformer-keys on AppState working to do a for loop.
    mergeState("root");
    mergeState("outputContainer");
    mergeState("subscriptionManagement");
    mergeState("snapshotsAndStreaming");
    mergeState("symbolDirectory");
    mergeState("timeSeries");
    mergeState("news");
    mergeState("metaData");

    return initialState;
}

// ---------------------------------------------------------------------------------------------------------------------------------

// Create and export the store.
export const store = createStore(reducer, initialState());
