/*
 * Action interfaces and dispatch functions for snapshots and streaming.
 */

import { ActionBase, ActionType } from "./actionType";
import { RelationshipInfo } from "../../components/snapshotsAndStreaming/relationship";
import { State } from "../reducers/snapshotsAndStreamingReducer";

import { Streaming } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

/** Set tab action. */
export interface SetSnapshotsAndStreamingTabAction extends ActionBase<ActionType.setSnapshotsAndStreamingTab> {
    activeTab: Streaming.AllRequestNames;
}

/** Dispatch function to add a relationship. */
export function dispatchSetSnapshotsAndStreamingTab(
    activeTab: string /*Streaming.AllRequestNames*/
): SetSnapshotsAndStreamingTabAction {
    return {
        type: ActionType.setSnapshotsAndStreamingTab,
        activeTab: activeTab as Streaming.AllRequestNames
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Add relationship interface. */
export interface AddRelationshipAction extends ActionBase<ActionType.addRelationship> {}

/** Dispatch function to add a relationship. */
export function dispatchAddRelationship(): AddRelationshipAction {
    return {
        type: ActionType.addRelationship
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Update relationship interface. */
export interface UpdateRelationshipAction extends ActionBase<ActionType.updateRelationship> {
    key: string;
    relationshipInfo: Partial<RelationshipInfo>;
}

/** Dispatch function to update a relationship. */
export function dispatchUpdateRelationship(key: string, relationshipInfo: Partial<RelationshipInfo>): UpdateRelationshipAction {
    return {
        type: ActionType.updateRelationship,
        key,
        relationshipInfo
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Remove relationship interface. */
export interface RemoveRelationshipAction extends ActionBase<ActionType.removeRelationship> {
    key: string;
}

/** Dispatch function to remove a relationship. */
export function dispatchRemoveRelationship(key: string): RemoveRelationshipAction {
    return {
        type: ActionType.removeRelationship,
        key
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Add SymbolId interface. */
export interface AddSymbolIdAction extends ActionBase<ActionType.addSymbolId> {}

/** Dispatch function to add a SymbolId. */
export function dispatchAddSymbolId(): AddSymbolIdAction {
    return {
        type: ActionType.addSymbolId
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Update SymbolId interface. */
export interface UpdateSymbolIdAction extends ActionBase<ActionType.updateSymbolId> {
    key: string;
    symbolId: Partial<Streaming.SymbolId>;
}

/** Dispatch function to update a SymbolId. */
export function dispatchUpdateSymbolId(key: string, symbolId: Partial<Streaming.SymbolId>): UpdateSymbolIdAction {
    return {
        type: ActionType.updateSymbolId,
        key,
        symbolId
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Remove SymbolId interface. */
export interface RemoveSymbolIdAction extends ActionBase<ActionType.removeSymbolId> {
    key: string;
}

/** Dispatch function to remove a SymbolId. */
export function dispatchRemoveSymbolId(key: string): RemoveSymbolIdAction {
    return {
        type: ActionType.removeSymbolId,
        key
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Update snapshots and streaming state interface. */
export interface UpdateSnapshotsAndStreamingAction extends ActionBase<ActionType.updateSnapshotsAndStreaming> {
    state: Partial<State>;
}

/** Dispatch function to update snapshots and streaming state. */
export function dispatchUpdateSnapshotsAndStreaming(state: Partial<State>): UpdateSnapshotsAndStreamingAction {
    return {
        type: ActionType.updateSnapshotsAndStreaming,
        state
    };
}
