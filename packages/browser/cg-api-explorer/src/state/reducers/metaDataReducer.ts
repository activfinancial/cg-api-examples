/*
 * Reducers & associated types for metadata.
 */

import { ActionType } from "../actions/actionType";
import Action from "../actions/actions";

import GetSubscriptionInfo from "../../components/metaData/getSubscriptionInfo";
import GetTableInfo from "../../components/metaData/getTableInfo";
import GetRelationshipInfo from "../../components/metaData/getRelationshipInfo";
import GetFieldInfo from "../../components/metaData/getFieldInfo";
import GetExchangeInfo from "../../components/metaData/getExchangeInfo";

import { PermissionLevel } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

// State we need to maintain here for the various requests.
type RequestState = GetSubscriptionInfo.LiftedState &
    GetTableInfo.LiftedState &
    GetRelationshipInfo.LiftedState &
    GetFieldInfo.LiftedState &
    GetExchangeInfo.LiftedState;

// State to store in redux store.
export interface State extends RequestState {
    activeTab: string;
}

// ---------------------------------------------------------------------------------------------------------------------------------

// Initial state.
const initialState: State = {
    activeTab: "getTableInfo",
    permissionLevel: PermissionLevel.realtime,
    fieldIds: [],
    symbol: ""
};

// ---------------------------------------------------------------------------------------------------------------------------------

// Reducer.
export function reducer(state: State = initialState, action: Action): State {
    switch (action.type) {
        case ActionType.setMetaDataTab:
            return {
                ...state,
                activeTab: action.activeTab
            };

        case ActionType.updateMetaData:
            return {
                ...state,
                ...action.state
            };

        default:
            return state;
    }
}
