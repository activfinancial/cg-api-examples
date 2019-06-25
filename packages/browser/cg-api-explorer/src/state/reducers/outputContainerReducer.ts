/*
 * Reducers & associated types for OutputContainer.
 */

import { ActionType } from "../actions/actionType";
import Action from "../actions/actions";
import { AppendOutputAction, OutputType } from "../actions/outputContainerActions";
import OutputControlsBar from "../../components/outputControlsBar";

// ---------------------------------------------------------------------------------------------------------------------------------

// State to store in redux store.
export interface State extends OutputControlsBar.LiftedState {
    output: React.ReactElement[];
}

// Initial state.
const initialState: State = {
    output: [],

    numberOfPendingRequests: 0,
    numberOfResponses: 0,
    numberOfUpdates: 0,

    displayRequests: false,
    displayResponses: true,
    displayUpdates: false
};

// ---------------------------------------------------------------------------------------------------------------------------------

// Reducer.
export function reducer(state: State = initialState, action: Action): State {
    switch (action.type) {
        case ActionType.appendOutput:
            return processAppendOutput(state, action);

        case ActionType.clearOutput:
            return {
                ...state,
                output: [],
                numberOfResponses: 0,
                numberOfUpdates: 0
            };

        case ActionType.adjustPendingRequestCounter:
            return {
                ...state,
                numberOfPendingRequests: state.numberOfPendingRequests + action.by
            };

        case ActionType.resetPendingRequestCounter:
            return {
                ...state,
                numberOfPendingRequests: 0
            };

        case ActionType.adjustResponseCounter:
            return {
                ...state,
                numberOfResponses: state.numberOfResponses + action.by
            };

        case ActionType.adjustUpdateCounter:
            return {
                ...state,
                numberOfUpdates: state.numberOfUpdates + action.by
            };

        case ActionType.toggleDisplayRequests:
            return {
                ...state,
                displayRequests: !state.displayRequests
            };

        case ActionType.toggleDisplayResponses:
            return {
                ...state,
                displayResponses: !state.displayResponses
            };

        case ActionType.toggleDisplayUpdates:
            return {
                ...state,
                displayUpdates: !state.displayUpdates
            };

        default:
            return state;
    }
}

// ---------------------------------------------------------------------------------------------------------------------------------

function processAppendOutput(state: State, action: AppendOutputAction): State {
    switch (action.outputType) {
        case OutputType.always:
            break;

        case OutputType.request:
            if (!state.displayRequests) {
                return state;
            }
            break;

        case OutputType.response:
            if (!state.displayResponses) {
                return state;
            }
            break;

        case OutputType.update:
            if (!state.displayUpdates) {
                return state;
            }
            break;

        default:
            return state;
    }

    return {
        ...state,
        output: state.output.concat(action.output)
    };
}
