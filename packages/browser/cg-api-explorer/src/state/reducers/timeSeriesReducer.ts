/*
 * Reducers & associated types for timeSeries.
 */

import uuid from "uuid/v4";

import { ActionType } from "../actions/actionType";
import Action from "../actions/actions";

import GetTicks from "../../components/timeSeries/getTicks";
import GetIntraday from "../../components/timeSeries/getIntraday";
import GetHistory from "../../components/timeSeries/getHistory";
import Period from "../../components/timeSeries/period";

import { TimeSeries } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

// State we need to maintain here for the various requests.
type RequestState = GetTicks.LiftedState & GetIntraday.LiftedState & GetHistory.LiftedState;

// State to store in redux store.
export interface State extends RequestState {
    activeTab: string;

    key: string;
    youngestFirst?: boolean;
    periods: Period.LiftedState[];
}

// ---------------------------------------------------------------------------------------------------------------------------------

// Initial state.
const initialState: State = {
    activeTab: "getHistoryDaily",

    // GetTicks.
    tickRecordFilterType: TimeSeries.TickRecordFilterType.none,

    // GetIntraday.
    intradayRecordFilterType: TimeSeries.IntradayRecordFilterType.none,
    intradayFieldFilterType: TimeSeries.IntradayFieldFilterType.miniBar,

    // GetHistory.
    historyFieldFilterType: TimeSeries.HistoryFieldFilterType.miniBar,

    // Common request parameters.
    key: "",
    periods: [
        {
            key: uuid(),
            type: TimeSeries.PeriodType.dataPointCount
        },
        {
            key: uuid(),
            type: TimeSeries.PeriodType.now
        }
    ]
};

// ---------------------------------------------------------------------------------------------------------------------------------

function findPeriod(state: State, key: string) {
    return state.periods.findIndex((period) => period.key === key);
}

// ---------------------------------------------------------------------------------------------------------------------------------

function addPeriod(state: State) {
    const newPeriod = {
        key: uuid(),
        type: TimeSeries.PeriodType.now
    };

    return {
        ...state,
        periods: [...state.periods, newPeriod]
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

function updatePeriod(state: State, key: string, period: Partial<Period.LiftedState>) {
    const index = findPeriod(state, key);
    if (index === -1) {
        return state;
    }

    const newPeriod = {
        ...state.periods[index],
        ...period
    };

    const periods = state.periods
        .slice(0, index)
        .concat(newPeriod)
        .concat(state.periods.slice(index + 1));

    return {
        ...state,
        periods
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

function removePeriod(state: State, key: string) {
    const index = findPeriod(state, key);
    if (index === -1) {
        return state;
    }

    const periods = state.periods.slice(0, index).concat(state.periods.slice(index + 1));

    return {
        ...state,
        periods
    };
}

// ---------------------------------------------------------------------------------------------------------------------------------

// Reducer.
export function reducer(state: State = initialState, action: Action): State {
    switch (action.type) {
        case ActionType.setTimeSeriesTab:
            return {
                ...state,
                activeTab: action.activeTab
            };

        case ActionType.addPeriod:
            return addPeriod(state);

        case ActionType.updatePeriod:
            return updatePeriod(state, action.key, action.period);

        case ActionType.removePeriod:
            return removePeriod(state, action.key);

        case ActionType.updateTimeSeries:
            return {
                ...state,
                ...action.state
            };

        default:
            return state;
    }
}
