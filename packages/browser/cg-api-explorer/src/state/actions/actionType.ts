/*
 * Redux action types.
 */

// ---------------------------------------------------------------------------------------------------------------------------------

// All available actions.
export enum ActionType {
    setUrl = "setUrl",
    setIsInternalNetwork = "setIsInternalNetwork",
    setClient = "setClient",
    setConnectionInfo = "setConnectionInfo",
    toggleGlobalCollapse = "toggleGlobalCollapse",
    addServerMessage = "addServerMessage",
    removeServerMessage = "removeServerMessage",

    appendOutput = "appendOutput",
    clearOutput = "clearOutput",

    adjustPendingRequestCounter = "adjustPendingRequestCounter",
    resetPendingRequestCounter = "resetPendingRequestCounter",

    adjustResponseCounter = "adjustResponseCounter",
    adjustUpdateCounter = "adjustUpdateCounter",

    toggleDisplayRequests = "toggleDisplayRequests",
    toggleDisplayResponses = "toggleDisplayResponses",
    toggleDisplayUpdates = "toggleDisplayUpdates",

    addSubscriptionInfo = "addSubscriptionInfo",
    updateSubscriptionInfo = "updateSubscriptionInfo",
    removeSubscriptionInfo = "removeSubscriptionInfo",
    unsubscribeAll = "unsubscribeAll",

    setSnapshotsAndStreamingTab = "setSnapshotsAndStreamingTab",
    updateSnapshotsAndStreaming = "updateSnapshotsAndStreaming",

    addRelationship = "addRelationship",
    updateRelationship = "updateRelationship",
    removeRelationship = "removeRelationship",

    addSymbolId = "addSymbolId",
    updateSymbolId = "updateSymbolId",
    removeSymbolId = "removeSymbolId",

    setTimeSeriesTab = "setTimeSeriesTab",
    updateTimeSeries = "updateTimeSeries",

    updateSymbolDirectory = "updateSymbolDirectory",

    addPeriod = "addPeriod",
    updatePeriod = "updatePeriod",
    removePeriod = "removePeriod",

    updateNews = "updateNews",

    setMetaDataTab = "setMetaDataTab",
    updateMetaData = "updateMetaData",

    other = "other"
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Base action interface. */
export interface ActionBase<T> {
    type: T;
}
