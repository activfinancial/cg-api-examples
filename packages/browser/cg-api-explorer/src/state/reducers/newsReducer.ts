/*
 * Reducers & associated types for news.
 */

import { ActionType } from "../actions/actionType";
import Action from "../actions/actions";

import { FieldId, News } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

// State to store in redux store.
export interface State extends News.IRequestParameters {}

// ---------------------------------------------------------------------------------------------------------------------------------

// Initial state.
const initialState: State = {
    query: "",
    numberOfRecords: 1,
    fieldIds: [FieldId.FID_HEADLINE, FieldId.FID_STORY_DATE_TIME]
};

// ---------------------------------------------------------------------------------------------------------------------------------

// Reducer.
export function reducer(state: State = initialState, action: Action): State {
    switch (action.type) {
        case ActionType.updateNews:
            return {
                ...state,
                ...action.state
            };

        default:
            return state;
    }
}
