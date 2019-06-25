/*
 * GetApiInfo controls.
 */

import * as React from "react";
import { connect } from "react-redux";
import Form from "react-bootstrap/Form";

import MakeRequest from "../makeRequest";
import { ConnectionState } from "../../connectionInfo";

import { AppState } from "../../state/store";

import { Client } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

namespace GetApiInfo {
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

        private readonly processSubmit = (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();

            MakeRequest.initiate("client.metaData.getApiInfo", "", "ApiInfo", () => this.props.client!.getApiInfo());
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
} // namespace GetApiInfo

export default GetApiInfo;
