/*
 * Action interfaces and dispatch functions for subscription management.
 */

import { ActionBase, ActionType } from "./actionType";
import SubscriptionManagementSection from "../../components/sections/subscriptionManagementSection";

// ---------------------------------------------------------------------------------------------------------------------------------

/** Add a subscription action. */
export interface AddSubscriptionInfoAction extends ActionBase<ActionType.addSubscriptionInfo> {
    subscriptionInfo: SubscriptionManagementSection.SubscriptionInfo;
}

/** Dispatch function to add subscription. */
export function dispatchAddSubscriptionInfo(
    subscriptionInfo: SubscriptionManagementSection.SubscriptionInfo
): AddSubscriptionInfoAction {
    return {
        type: ActionType.addSubscriptionInfo,
        subscriptionInfo
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Update a subscription action. */
export interface UpdateSubscriptionInfoAction extends ActionBase<ActionType.updateSubscriptionInfo> {
    key: string;
    subscriptionInfo: Partial<SubscriptionManagementSection.SubscriptionInfo>;
}

/** Dispatch function to update subscription. */
export function dispatchUpdateSubscriptionInfo(
    key: string,
    subscriptionInfo: Partial<SubscriptionManagementSection.SubscriptionInfo>
): UpdateSubscriptionInfoAction {
    return {
        type: ActionType.updateSubscriptionInfo,
        key,
        subscriptionInfo
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Remove a subscription action. */
export interface RemoveSubscriptionInfoAction extends ActionBase<ActionType.removeSubscriptionInfo> {
    key: string;
}

/** Dispatch function to remove subscription. */
export function dispatchRemoveSubscriptionInfo(key: string): RemoveSubscriptionInfoAction {
    return {
        type: ActionType.removeSubscriptionInfo,
        key
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Unsubscribe all action. */
export interface UnsubscribeAllAction extends ActionBase<ActionType.unsubscribeAll> {}

/** Dispatch function to remove all subscriptions. */
export function dispatchUnsubscribeAll(): UnsubscribeAllAction {
    return {
        type: ActionType.unsubscribeAll
    };
}
