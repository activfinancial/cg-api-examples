/*
 * GetContentGatewayInfo controls.
 */

import * as React from "react";
import { connect } from "react-redux";
import Form from "react-bootstrap/Form";

import MakeRequest from "../makeRequest";
import { ConnectionState } from "../../connectionInfo";

import { AppState } from "../../state/store";

import { Client } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

namespace GetContentGatewayInfo {
    // Own props.
    interface OwnProps {}

    // Redux state we'll see as props.
    interface ReduxStateProps {
        client: Client | null;
        connectionState: ConnectionState;
    }

    // All props.
    type Props = OwnProps & ReduxStateProps;

    class ComponentImpl extends React.PureComponent<Props> {
        render() {
            return (
                <Form onSubmit={this.processSubmit}>
                    <MakeRequest.Component />
                </Form>
            );
        }

        private readonly processSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();

            MakeRequest.initiateAsyncIterable(
                "client.metaData.getContentGatewayInfo",
                "",
                "MetaData.ContentGatewayInfo",
                () => this.props.client!.metaData.getContentGatewayInfo(),
                null,
                false
            );
        };
    }

    function mapStateToProps(state: AppState): ReduxStateProps {
        return {
            client: state.root.client,
            connectionState: state.root.connectionInfo.connectionState
        };
    }

    // Generate redux connected component.
    export const Component = connect(mapStateToProps)(ComponentImpl);
} // namespace GetContentGatewayInfo

export default GetContentGatewayInfo;
