/*
 * Action interfaces and dispatch functions for the root state.
 */

import { ActionBase, ActionType } from "./actionType";
import { ConnectionInfo } from "../../connectionInfo";

import { IClient } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

/** Set url action. */
export interface SetUrlAction extends ActionBase<ActionType.setUrl> {
    url: string;
}

/** Dispatch function to set internal network. */
export function dispatchSetUrl(url: string): SetUrlAction {
    return {
        type: ActionType.setUrl,
        url
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Set isInternalNetwork action. */
export interface IsInternalNetworkAction extends ActionBase<ActionType.setIsInternalNetwork> {
    isInternalNetwork: boolean;
}

/** Dispatch function to set internal network. */
export function dispatchIsInternalNetworkAction(isInternalNetwork: boolean): IsInternalNetworkAction {
    return {
        type: ActionType.setIsInternalNetwork,
        isInternalNetwork
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Set client action interface. */
export interface SetClientAction extends ActionBase<ActionType.setClient> {
    client: IClient | null;
}

/** Dispatch function to set client. */
export function dispatchSetClient(client: IClient | null): SetClientAction {
    return {
        type: ActionType.setClient,
        client
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Set ConnectionInfo action interface. */
export interface SetConnectionInfoAction extends ActionBase<ActionType.setConnectionInfo> {
    connectionInfo: ConnectionInfo;
}

/** Dispatch function to set ConnectionInfo. */
export function dispatchSetConnectionInfo(connectionInfo: ConnectionInfo): SetConnectionInfoAction {
    return {
        type: ActionType.setConnectionInfo,
        connectionInfo
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Toggle collapse interface. */
export interface ToggleGlobalCollapseAction extends ActionBase<ActionType.toggleGlobalCollapse> {}

/** Dispatch function to toggle collapse. */
export function dispatchToggleGlobalCollapse(): ToggleGlobalCollapseAction {
    return {
        type: ActionType.toggleGlobalCollapse
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Add server message action interface. */
export interface AddServerMessageAction extends ActionBase<ActionType.addServerMessage> {
    message: string;
}

/** Dispatch function to add server message. */
export function dispatchAddServerMessage(message: string): AddServerMessageAction {
    return {
        type: ActionType.addServerMessage,
        message
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Remove server message action interface. */
export interface RemoveServerMessageAction extends ActionBase<ActionType.removeServerMessage> {
    key: string;
}

/** Dispatch function to remove server message. */
export function dispatchRemoveServerMessage(key: string): RemoveServerMessageAction {
    return {
        type: ActionType.removeServerMessage,
        key
    };
}
