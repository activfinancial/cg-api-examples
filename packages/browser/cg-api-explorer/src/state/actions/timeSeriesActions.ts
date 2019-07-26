/*
 * Action interfaces and dispatch functions for time series.
 */

import { ActionBase, ActionType } from "./actionType";
import { State } from "../reducers/timeSeriesReducer";
import * as Period from "../../components/timeSeries/period";

import { TimeSeries } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

/** Set tab action. */
export interface SetTimeSeriesTabAction extends ActionBase<ActionType.setTimeSeriesTab> {
    activeTab: TimeSeries.AllRequestNames;
}

/** Dispatch function to add a relationship. */
export function dispatchSetTimeSeriesTab(activeTab: string /*TimeSeries.AllRequestNames*/): SetTimeSeriesTabAction {
    return {
        type: ActionType.setTimeSeriesTab,
        activeTab: activeTab as TimeSeries.AllRequestNames
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Update time series state interface. */
export interface UpdateTimeSeriesAction extends ActionBase<ActionType.updateTimeSeries> {
    state: Partial<State>;
}

/** Dispatch function to update time series state. */
export function dispatchUpdateTimeSeries(state: Partial<State>): UpdateTimeSeriesAction {
    return {
        type: ActionType.updateTimeSeries,
        state
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Add period interface. */
export interface AddPeriodAction extends ActionBase<ActionType.addPeriod> {}

/** Dispatch function to add a period. */
export function dispatchAddPeriod(): AddPeriodAction {
    return {
        type: ActionType.addPeriod
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Update period interface. */
export interface UpdatePeriodAction extends ActionBase<ActionType.updatePeriod> {
    key: string;
    period: Partial<Period.LiftedState>;
}

/** Dispatch function to update a period. */
export function dispatchUpdatePeriod(key: string, period: Partial<Period.LiftedState>): UpdatePeriodAction {
    return {
        type: ActionType.updatePeriod,
        key,
        period
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Remove period interface. */
export interface RemovePeriodAction extends ActionBase<ActionType.removePeriod> {
    key: string;
}

/** Dispatch function to remove a period. */
export function dispatchRemovePeriod(key: string): RemovePeriodAction {
    return {
        type: ActionType.removePeriod,
        key
    };
}
