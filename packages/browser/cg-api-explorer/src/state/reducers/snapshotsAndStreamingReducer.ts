/*
 * Reducers & associated types for SnapshotsAndStreaming.
 */

import uuid from "uuid/v4";

import { ActionType } from "../actions/actionType";
import Action from "../actions/actions";

import { RelationshipInfo } from "../../components/snapshotsAndStreaming/relationship";
import * as GetEqual from "../../components/snapshotsAndStreaming/getEqual";
import * as GetMatch from "../../components/snapshotsAndStreaming/getMatch";
import * as GetPattern from "../../components/snapshotsAndStreaming/getPattern";
import * as GetFirstLast from "../../components/snapshotsAndStreaming/getFirstLast";
import * as GetNextPrevious from "../../components/snapshotsAndStreaming/getNextPrevious";

import { EventType, PermissionLevel, Streaming, TableNumber } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

// State we need to maintain here for the various requests.
type RequestState = GetEqual.LiftedState &
    GetMatch.LiftedState &
    GetPattern.LiftedState &
    GetFirstLast.LiftedState &
    GetNextPrevious.LiftedState;

// State to store in redux store.
export interface State extends RequestState {
    activeTab: Streaming.AllRequestNames;

    subscriptionType?: Streaming.SubscriptionType;
    eventTypes: EventType[];
    conflationType?: Streaming.ConflationType;
    conflationInterval: number;
    shouldEnableDynamicConflation: boolean;
    relationships: RelationshipInfo[];
    permissionLevel?: PermissionLevel;
    aliasMode: Streaming.AliasMode;
}

// ---------------------------------------------------------------------------------------------------------------------------------

const defaultRelationshipInfo = {
    subscribe: true
};

// ---------------------------------------------------------------------------------------------------------------------------------

// Initial state.
const initialState: State = {
    activeTab: "getMatch",

    eventTypes: [],
    conflationInterval: 1000,
    shouldEnableDynamicConflation: false,
    relationships: [{ ...defaultRelationshipInfo, key: uuid() }],
    aliasMode: Streaming.AliasMode.normal,

    symbolList: [],

    matchType: Streaming.GetMatchType.composite,
    alwaysGetMatch: true,

    symbolIdList: [{ tableNumber: TableNumber.usListing, symbol: "", key: uuid() }],
    reverseOrder: false,

    numberOfRecords: 1,
    symbol: ""
};

// ---------------------------------------------------------------------------------------------------------------------------------

function findRelationship(state: State, key: string) {
    return state.relationships.findIndex((relationshipInfo) => relationshipInfo.key === key);
}

// ---------------------------------------------------------------------------------------------------------------------------------

function addRelationship(state: State) {
    const relationshipInfo = {
        ...defaultRelationshipInfo,
        key: uuid()
    };

    const relationships = [...state.relationships, relationshipInfo];

    return {
        ...state,
        relationships
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

function updateRelationship(state: State, key: string, relationshipInfo: Partial<RelationshipInfo>) {
    const index = findRelationship(state, key);
    if (index === -1) {
        return state;
    }

    const newRelationshipInfo = Object.assign({}, state.relationships[index], relationshipInfo);
    const relationships = state.relationships
        .slice(0, index)
        .concat(newRelationshipInfo)
        .concat(state.relationships.slice(index + 1));

    return {
        ...state,
        relationships
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

function removeRelationship(state: State, key: string) {
    const index = findRelationship(state, key);
    if (index === -1) {
        return state;
    }

    const relationships = state.relationships.slice(0, index).concat(state.relationships.slice(index + 1));

    return {
        ...state,
        relationships
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

function findSymbolId(state: State, key: string) {
    return state.symbolIdList.findIndex((symbolId) => symbolId.key === key);
}

// ---------------------------------------------------------------------------------------------------------------------------------

function addSymbolId(state: State) {
    const symbolId = {
        tableNumber: TableNumber.usListing,
        symbol: "",
        key: uuid()
    };

    const symbolIdList = [...state.symbolIdList, symbolId];

    return {
        ...state,
        symbolIdList
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

function updateSymbolId(state: State, key: string, symbolId: Partial<Streaming.ISymbolId>) {
    const index = findSymbolId(state, key);
    if (index === -1) {
        return state;
    }

    const newSymbolId = Object.assign({}, state.symbolIdList[index], symbolId);
    const symbolIdList = state.symbolIdList
        .slice(0, index)
        .concat(newSymbolId)
        .concat(state.symbolIdList.slice(index + 1));

    return {
        ...state,
        symbolIdList
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

function removeSymbolId(state: State, key: string) {
    const index = findSymbolId(state, key);
    if (index === -1) {
        return state;
    }

    const symbolIdList = state.symbolIdList.slice(0, index).concat(state.symbolIdList.slice(index + 1));

    return {
        ...state,
        symbolIdList
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

// Reducer.
export function reducer(state: State = initialState, action: Action): State {
    switch (action.type) {
        case ActionType.setSnapshotsAndStreamingTab:
            return {
                ...state,
                activeTab: action.activeTab
            };

        case ActionType.addRelationship:
            return addRelationship(state);

        case ActionType.updateRelationship:
            return updateRelationship(state, action.key, action.relationshipInfo);

        case ActionType.removeRelationship:
            return removeRelationship(state, action.key);

        case ActionType.addSymbolId:
            return addSymbolId(state);

        case ActionType.updateSymbolId:
            return updateSymbolId(state, action.key, action.symbolId);

        case ActionType.removeSymbolId:
            return removeSymbolId(state, action.key);

        case ActionType.updateSnapshotsAndStreaming:
            return {
                ...state,
                ...action.state
            };

        default:
            return state;
    }
}
