/*
 * Action interfaces and dispatch functions for the output side.
 */

import { ReactElement } from "react";
import { ActionBase, ActionType } from "./actionType";

// ---------------------------------------------------------------------------------------------------------------------------------

/** Type of output. */
export enum OutputType {
    /** A request. Whether to output is controlled by a toggle. */
    request,

    /** A response. Whether to output is controlled by a toggle. */
    response,

    /** An update. Whether to output is controlled by a toggle. */
    update,

    /** Something to always display, regardless of response & update controls. */
    always
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Adjust pending request counter action interface. */
export interface AdjustPendingRequestCounterAction extends ActionBase<ActionType.adjustPendingRequestCounter> {
    by: number;
}

/** Dispatch function to adjust pending request counter. */
export function dispatchAdjustPendingRequestCounter(by: number): AdjustPendingRequestCounterAction {
    return {
        type: ActionType.adjustPendingRequestCounter,
        by
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Reset pending request counter action interface. */
export interface ResetPendingRequestCounterAction extends ActionBase<ActionType.resetPendingRequestCounter> {}

/** Dispatch function to reset pending request counter. */
export function dispatchResetPendingRequestCounter(): ResetPendingRequestCounterAction {
    return {
        type: ActionType.resetPendingRequestCounter
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Adjust response counter action interface. */
export interface AdjustResponseCounterAction extends ActionBase<ActionType.adjustResponseCounter> {
    by: number;
}

/** Dispatch function to adjust response counter. */
export function dispatchAdjustResponseCounter(by: number): AdjustResponseCounterAction {
    return {
        type: ActionType.adjustResponseCounter,
        by
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Adjust update counter action interface. */
export interface AdjustUpdateCounterAction extends ActionBase<ActionType.adjustUpdateCounter> {
    by: number;
}

/** Dispatch function to adjust response counter. */
export function dispatchAdjustUpdateCounter(by: number): AdjustUpdateCounterAction {
    return {
        type: ActionType.adjustUpdateCounter,
        by
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Toggle display requests action interface. */
export interface ToggleDisplayRequestsAction extends ActionBase<ActionType.toggleDisplayRequests> {}

/** Dispatch function to toggle displaying responses. */
export function dispatchToggleDisplayRequests(): ToggleDisplayRequestsAction {
    return {
        type: ActionType.toggleDisplayRequests
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Toggle display responses action interface. */
export interface ToggleDisplayResponsesAction extends ActionBase<ActionType.toggleDisplayResponses> {}

/** Dispatch function to toggle displaying responses. */
export function dispatchToggleDisplayResponses(): ToggleDisplayResponsesAction {
    return {
        type: ActionType.toggleDisplayResponses
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Toggle display updates action interface. */
export interface ToggleDisplayUpdatesAction extends ActionBase<ActionType.toggleDisplayUpdates> {}

/** Dispatch function to toggle displaying updates. */
export function dispatchToggleDisplayUpdates(): ToggleDisplayUpdatesAction {
    return {
        type: ActionType.toggleDisplayUpdates
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Append output interface. */
export interface AppendOutputAction extends ActionBase<ActionType.appendOutput> {
    output: ReactElement;
    outputType: OutputType;
}

/** Dispatch function to append output. */
export function dispatchAppendOutput(outputType: OutputType, output: ReactElement): AppendOutputAction {
    return {
        type: ActionType.appendOutput,
        outputType,
        output
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

/** Clear output interface. */
export interface ClearOutputAction extends ActionBase<ActionType.clearOutput> {}

/** Dispatch function to clear output. */
export function dispatchClearOutput() {
    return {
        type: ActionType.clearOutput
    };
}
