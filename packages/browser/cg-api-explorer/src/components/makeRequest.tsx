/*
 * Initiate request button. Adds some style and is disabled when CG connection isn't up.
 */

import * as React from "react";
import { connect } from "react-redux";
import Button from "react-bootstrap/Button";

import { store, AppState } from "../state/store";
import { dispatchAdjustPendingRequestCounter, dispatchAppendOutput, OutputType } from "../state/actions/outputContainerActions";
import { createHeaderTimestamp, renderAsyncIterableResponse, renderResponse, renderError } from "../outputFormatters";

import { ConnectionState } from "../connectionInfo";

// ---------------------------------------------------------------------------------------------------------------------------------

// Own properties.
interface OwnProps {
    title?: string;
}

// Redux state we'll see as props.
interface ReduxStateProps {
    connectionState: ConnectionState;
}

// All props.
type Props = OwnProps & ReduxStateProps;

class ComponentImpl extends React.PureComponent<Props> {
    render() {
        return (
            <Button
                variant="primary"
                size="sm"
                type="submit"
                className="float-right"
                disabled={this.props.connectionState !== ConnectionState.connected}
            >
                {this.props.title ? this.props.title : "Make request"}&nbsp;
                <span className="far fa-hand-point-right" />
            </Button>
        );
    }
}

function mapStateToProps(state: AppState): ReduxStateProps {
    return {
        connectionState: state.root.connectionInfo.connectionState
    };
}

// Generate redux connected component.
export const Component = connect(mapStateToProps)(ComponentImpl);

type ErrorHandler = () => void;

/**
 * Initiate a request that returns an async iterable.
 *
 * @param requestName name of the request to display in output, e.g. "getEqual".
 * @param recordTypeName name of the response record type, e.g. "Streaming.Record".
 * @param requestParameters for pretty-printed output.
 * @param initiateRequest function to actually initiate the request. Should return a requestHandle async iterable.
 * @param errorHandler function for handling errors after initiating the request (e.g. cleanup unsubscription UIs).
 * @param countPendingRequest whether to count a pending request. Just a hack for getContentGatewayInfo() which
 *        never completes.
 */
export async function initiateAsyncIterable<T>(
    requestName: string,
    requestParameters: string,
    recordTypeName: string,
    initiateRequest: () => AsyncIterable<T>,
    errorHandler: ErrorHandler | null = null,
    countPendingRequest: boolean = true
) {
    // HACK TODO maybe tidy this up. It's due to getContentGatewayInfo which is an infinite request...
    if (countPendingRequest) {
        store.dispatch(dispatchAdjustPendingRequestCounter(1));
    }

    store.dispatch(
        dispatchAppendOutput(
            OutputType.request,
            <div>
                {createHeaderTimestamp()}
                {requestName}({requestParameters});
            </div>
        )
    );

    try {
        const startTimestamp = performance.now();
        const requestHandle = initiateRequest();
        await renderAsyncIterableResponse(requestName, recordTypeName, startTimestamp, requestHandle);
    } catch (error) {
        renderError(requestName, error);

        if (errorHandler != null) {
            errorHandler();
        }
    }

    if (countPendingRequest) {
        store.dispatch(dispatchAdjustPendingRequestCounter(-1));
    }
}

/**
 * Initiate a request.
 *
 * @param requestName name of the request to display in output, e.g. "getEqual".
 * @param recordTypeName name of the response record type, e.g. "Streaming.Record".
 * @param requestParameters pretty-printed request parameters.
 * @param initiateRequest function to actually initiate the request. Should return a requestHandle async iterable.
 */
export async function initiate<T>(
    requestName: string,
    requestParameters: string,
    recordTypeName: string,
    initiateRequest: () => Promise<T> | T
) {
    store.dispatch(dispatchAdjustPendingRequestCounter(1));

    store.dispatch(
        dispatchAppendOutput(
            OutputType.request,
            <div>
                {createHeaderTimestamp()}
                {requestName}({requestParameters});
            </div>
        )
    );

    try {
        const startTimestamp = performance.now();
        let response: Promise<T> | T = initiateRequest();
        if (response instanceof Promise) {
            response = await response;
        }

        renderResponse(requestName, recordTypeName, startTimestamp, response);
    } catch (error) {
        renderError(requestName, error);
    }

    store.dispatch(dispatchAdjustPendingRequestCounter(-1));
}
