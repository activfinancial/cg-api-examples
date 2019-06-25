/*
 * Reducers & associated types for subscription management.
 */

import { ActionType } from "../actions/actionType";
import Action from "../actions/actions";

import { SubscriptionInfo } from "../../components/sections/subscriptionManagementSection";

// ---------------------------------------------------------------------------------------------------------------------------------

// State to store in redux store.
export interface State {
    subscriptionInfoList: SubscriptionInfo[];
}

// ---------------------------------------------------------------------------------------------------------------------------------

// Initial state.
const initialState: State = {
    subscriptionInfoList: []
};

// ---------------------------------------------------------------------------------------------------------------------------------

function findSubscriptionInfo(state: State, key: string) {
    return state.subscriptionInfoList.findIndex((subscriptionInfo) => subscriptionInfo.key === key);
}

// ---------------------------------------------------------------------------------------------------------------------------------

function addSubscriptionInfo(state: State, subscriptionInfo: SubscriptionInfo) {
    const subscriptionInfoList = [...state.subscriptionInfoList, subscriptionInfo];

    return {
        ...state,
        subscriptionInfoList
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

function updateSubscriptionInfo(state: State, key: string, subscriptionInfo: Partial<SubscriptionInfo>) {
    const index = findSubscriptionInfo(state, key);
    if (index === -1) {
        return state;
    }

    const newSubscriptionInfo = {
        ...state.subscriptionInfoList[index],
        ...subscriptionInfo
    };

    const subscriptionInfoList = state.subscriptionInfoList
        .slice(0, index)
        .concat(newSubscriptionInfo)
        .concat(state.subscriptionInfoList.slice(index + 1));

    return { ...state, subscriptionInfoList };
}

// ---------------------------------------------------------------------------------------------------------------------------------

function removeSubscriptionInfo(state: State, key: string) {
    const index = findSubscriptionInfo(state, key);
    if (index === -1) {
        return state;
    }

    state.subscriptionInfoList[index].requestHandle.delete();
    const subscriptionInfoList = state.subscriptionInfoList.slice(0, index).concat(state.subscriptionInfoList.slice(index + 1));

    return { ...state, subscriptionInfoList };
}

// ---------------------------------------------------------------------------------------------------------------------------------

function unsubscribeAll(state: State) {
    for (const subscriptionInfo of state.subscriptionInfoList) {
        subscriptionInfo.requestHandle.delete();
    }

    return {
        ...state,
        subscriptionInfoList: []
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

// Reducer.
export function reducer(state: State = initialState, action: Action): State {
    switch (action.type) {
        case ActionType.addSubscriptionInfo:
            return addSubscriptionInfo(state, action.subscriptionInfo);

        case ActionType.updateSubscriptionInfo:
            return updateSubscriptionInfo(state, action.key, action.subscriptionInfo);

        case ActionType.removeSubscriptionInfo:
            return removeSubscriptionInfo(state, action.key);

        case ActionType.unsubscribeAll:
            return unsubscribeAll(state);

        default:
            return state;
    }
}
