/*
 * All redux action interfaces.
 */

import { ActionBase, ActionType } from "../actions/actionType";

import {
    SetUrlAction,
    IsInternalNetworkAction,
    SetClientAction,
    SetConnectionInfoAction,
    ToggleGlobalCollapseAction,
    AddServerMessageAction,
    RemoveServerMessageAction
} from "./rootActions";

import {
    AdjustPendingRequestCounterAction,
    ResetPendingRequestCounterAction,
    AdjustResponseCounterAction,
    AdjustUpdateCounterAction,
    ToggleDisplayRequestsAction,
    ToggleDisplayResponsesAction,
    ToggleDisplayUpdatesAction,
    AppendOutputAction,
    ClearOutputAction
} from "./outputContainerActions";

import {
    AddSubscriptionInfoAction,
    UpdateSubscriptionInfoAction,
    RemoveSubscriptionInfoAction,
    UnsubscribeAllAction
} from "./subscriptionManagementActions";

import {
    SetSnapshotsAndStreamingTabAction,
    AddRelationshipAction,
    UpdateRelationshipAction,
    RemoveRelationshipAction,
    AddSymbolIdAction,
    UpdateSymbolIdAction,
    RemoveSymbolIdAction,
    UpdateSnapshotsAndStreamingAction
} from "./snapshotsAndStreamingActions";

import { UpdateSymbolDirectoryAction } from "./symbolDirectoryActions";

import {
    SetTimeSeriesTabAction,
    UpdateTimeSeriesAction,
    AddPeriodAction,
    UpdatePeriodAction,
    RemovePeriodAction
} from "./timeSeriesActions";

import { UpdateNewsAction } from "./newsActions";

import { SetMetaDataTabAction, UpdateMetaDataAction } from "./metaDataActions";

// ---------------------------------------------------------------------------------------------------------------------------------

// Helper to ensure default case is present.
interface OtherAction extends ActionBase<ActionType.other> {}

// ---------------------------------------------------------------------------------------------------------------------------------

// Union of all action types.
type Action =
    | SetUrlAction
    | IsInternalNetworkAction
    | SetClientAction
    | SetConnectionInfoAction
    | ToggleGlobalCollapseAction
    | AddServerMessageAction
    | RemoveServerMessageAction
    | AdjustPendingRequestCounterAction
    | ResetPendingRequestCounterAction
    | AdjustResponseCounterAction
    | AdjustUpdateCounterAction
    | ToggleDisplayRequestsAction
    | ToggleDisplayResponsesAction
    | ToggleDisplayUpdatesAction
    | AppendOutputAction
    | ClearOutputAction
    | AddSubscriptionInfoAction
    | UpdateSubscriptionInfoAction
    | RemoveSubscriptionInfoAction
    | UnsubscribeAllAction
    | SetSnapshotsAndStreamingTabAction
    | UpdateSnapshotsAndStreamingAction
    | AddRelationshipAction
    | UpdateRelationshipAction
    | RemoveRelationshipAction
    | AddSymbolIdAction
    | UpdateSymbolIdAction
    | RemoveSymbolIdAction
    | UpdateSymbolDirectoryAction
    | SetTimeSeriesTabAction
    | UpdateTimeSeriesAction
    | AddPeriodAction
    | UpdatePeriodAction
    | RemovePeriodAction
    | UpdateNewsAction
    | SetMetaDataTabAction
    | UpdateMetaDataAction
    | OtherAction;

// ---------------------------------------------------------------------------------------------------------------------------------

export default Action;
