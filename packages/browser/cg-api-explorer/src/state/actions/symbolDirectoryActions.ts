/*
 * Action interfaces and dispatch functions for symbol directory.
 */

import { ActionBase, ActionType } from "./actionType";
import { State } from "../reducers/symbolDirectoryReducer";

// ---------------------------------------------------------------------------------------------------------------------------------

/** Update symbol directory state interface. */
export interface UpdateSymbolDirectoryAction extends ActionBase<ActionType.updateSymbolDirectory> {
    state: Partial<State>;
}

/** Dispatch function to update symbol directory state. */
export function dispatchUpdateSymbolDirectory(state: Partial<State>): UpdateSymbolDirectoryAction {
    return {
        type: ActionType.updateSymbolDirectory,
        state
    };
}
