/*
 * GetPermissionInfo controls.
 */

import * as React from "react";
import { connect } from "react-redux";
import Form from "react-bootstrap/Form";

import MakeRequest from "../makeRequest";
import { ConnectionState } from "../../connectionInfo";

import { AppState } from "../../state/store";

import { Client, PermissionLevel } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

namespace GetPermissionInfo {
    // Own props.
    interface OwnProps {}

    // Redux state we'll see as props.
    interface ReduxStateProps {
        client: Client | null;
        connectionState: ConnectionState;
    }

    // All props.
    type Props = OwnProps & ReduxStateProps;

    interface State {
        permissionLevel: PermissionLevel;
    }

    class ComponentImpl extends React.PureComponent<Props, State> {
        constructor(props: Props) {
            super(props);

            this.state = {
                permissionLevel: PermissionLevel.realtime
            };
        }

        render() {
            return (
                <Form onSubmit={this.processSubmit}>
                    <MakeRequest.Component />
                </Form>
            );
        }

        private readonly processSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();

            MakeRequest.initiate("client.metaData.getPermissionInfo", "", "MetaData.PermissionInfo", () =>
                this.props.client!.metaData.getPermissionInfo()
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
} // namespace GetPermissionInfo

export default GetPermissionInfo;
