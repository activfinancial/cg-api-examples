/*
 * Action interfaces and dispatch functions for metadata.
 */

import { ActionBase, ActionType } from "./actionType";
import { State } from "../reducers/metaDataReducer";

import { MetaData } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

/** Set tab action. */
export interface SetMetaDataTabAction extends ActionBase<ActionType.setMetaDataTab> {
    activeTab: string;
}

/** Dispatch function to add a relationship. */
export function dispatchSetMetaDataTab(activeTab: string): SetMetaDataTabAction {
    return {
        type: ActionType.setMetaDataTab,
        activeTab
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Update metadata state interface. */
export interface UpdateMetaDataAction extends ActionBase<ActionType.updateMetaData> {
    state: Partial<State>;
}

/** Dispatch function to update metadata state. */
export function dispatchUpdateMetaData(state: Partial<State>): UpdateMetaDataAction {
    return {
        type: ActionType.updateMetaData,
        state
    };
}
