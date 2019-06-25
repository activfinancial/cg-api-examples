/*
 * Root reducers.
 */

import { ActionType } from "../actions/actionType";
import Action from "../actions/actions";
import { ConnectionInfo, ConnectionState } from "../../connectionInfo";
import ConnectionManagementSection, { makeContentGatewayUrl } from "../../components/sections/connectionManagementSection";
import uuid from "uuid/v4";

import { Client } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

export interface ServerMessage {
    key: string;
    message: string;
}

// ---------------------------------------------------------------------------------------------------------------------------------

// State to store in redux.
export interface State extends ConnectionManagementSection.LiftedState {
    /** On ACTIV internal network? */
    isInternalNetwork: boolean;

    /** CG API client. */
    client: Client | null;

    /** Connection state. */
    connectionInfo: ConnectionInfo;

    /** Collapse state for input section. */
    globalCollapseState: boolean;

    /** Messages from CG. */
    serverMessages: ServerMessage[];
}

// ---------------------------------------------------------------------------------------------------------------------------------

// Initial root state.
const initialState: State = {
    url: makeContentGatewayUrl(""),

    // Assume not until we know better.
    isInternalNetwork: false,

    client: null,

    connectionInfo: {
        connectionState: ConnectionState.disconnected,
        hostname: "",

        // Don't hide anything initially; might as well as allow browsing what might be available.
        isHistoryServiceAvailable: true,
        isNewsServerServiceAvailable: true,
        isSymbolDirectoryServiceAvailable: true,

        isDynamicConflationAvailable: false
    },

    globalCollapseState: false,

    serverMessages: []
};

// ---------------------------------------------------------------------------------------------------------------------------------

function addServerMessage(state: State, message: string) {
    const serverMessage = {
        key: uuid(),
        message
    };

    return {
        ...state,
        serverMessages: [...state.serverMessages, serverMessage]
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

function removeServerMessage(state: State, key: string) {
    const index = state.serverMessages.findIndex((serverMessage) => serverMessage.key === key);
    if (index === -1) {
        return state;
    }

    const serverMessages = state.serverMessages.slice(0, index).concat(state.serverMessages.slice(index + 1));

    return { ...state, serverMessages };
}

// ---------------------------------------------------------------------------------------------------------------------------------

// Reducer.
export function reducer(state: State = initialState, action: Action): State {
    switch (action.type) {
        case ActionType.setUrl:
            return {
                ...state,
                url: action.url
            };

        case ActionType.setIsInternalNetwork:
            return {
                ...state,
                isInternalNetwork: action.isInternalNetwork
            };

        case ActionType.setClient:
            return {
                ...state,
                client: action.client
                // Any change of client there can be no pending requests.
                // TODO now in output container.
                // numberOfPendingRequests: 0
            };

        case ActionType.setConnectionInfo:
            return {
                ...state,
                connectionInfo: action.connectionInfo
            };

        case ActionType.toggleGlobalCollapse:
            return {
                ...state,
                globalCollapseState: !state.globalCollapseState
            };

        case ActionType.addServerMessage:
            return addServerMessage(state, action.message);

        case ActionType.removeServerMessage:
            return removeServerMessage(state, action.key);

        default:
            return state;
    }
}
