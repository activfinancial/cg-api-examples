/*
 * Reducers & associated types for symbol directory.
 */

import { ActionType } from "../actions/actionType";
import Action from "../actions/actions";

import { FieldId, SymbolDirectory } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

// State to store in redux store.
export interface State extends SymbolDirectory.IRequestParameters {}

// ---------------------------------------------------------------------------------------------------------------------------------

// Initial state.
const initialState: State = {
    fieldId: FieldId.FID_NAME,
    search: "",
    matchType: SymbolDirectory.MatchType.exact,
    entityTypes: []
};

// ---------------------------------------------------------------------------------------------------------------------------------

// Reducer.
export function reducer(state: State = initialState, action: Action): State {
    switch (action.type) {
        case ActionType.updateSymbolDirectory:
            return {
                ...state,
                ...action.state
            };

        default:
            return state;
    }
}
