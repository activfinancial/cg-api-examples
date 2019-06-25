/*
 * Action interfaces and dispatch functions for news.
 */

import { ActionBase, ActionType } from "./actionType";
import { State } from "../reducers/newsReducer";

// ---------------------------------------------------------------------------------------------------------------------------------

/** Update news state interface. */
export interface UpdateNewsAction extends ActionBase<ActionType.updateNews> {
    state: Partial<State>;
}

/** Dispatch function to update time series state. */
export function dispatchUpdateNews(state: Partial<State>): UpdateNewsAction {
    return {
        type: ActionType.updateNews,
        state
    };
}
