/*
 * GetSubscriptionInfo controls.
 */

import * as React from "react";
import { connect } from "react-redux";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";

import MakeRequest from "../makeRequest";
import { ConnectionState } from "../../connectionInfo";
import PermissionLevelControl from "../controls/permissionLevelControl";
import { labelColumnClass, inputColumnWidth } from "../../columnDefinitions";

import { AppState } from "../../state/store";
import { dispatchUpdateMetaData } from "../../state/actions/metaDataActions";

import { Client, PermissionLevel } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

namespace GetSubscriptionInfo {
    // State to be lifted up elsewhere (redux in our case).
    export interface LiftedState extends PermissionLevelControl.LiftedState {}

    // Own props.
    interface OwnProps {}

    // Redux state we'll see as props.
    interface ReduxStateProps extends LiftedState {
        client: Client | null;
        connectionState: ConnectionState;
    }

    // Redux dispatch functions we use.
    const mapDispatchToProps = {
        dispatchUpdateMetaData
    };

    // All props.
    type Props = OwnProps & ReduxStateProps & typeof mapDispatchToProps;

    class ComponentImpl extends React.PureComponent<Props> {
        render() {
            return (
                <Form onSubmit={this.processSubmit}>
                    <Form.Group as={Form.Row} className="form-group-margin">
                        <Form.Label column className={`${labelColumnClass} text-right`}>
                            Permission level:
                        </Form.Label>
                        <Col sm={inputColumnWidth}>
                            <PermissionLevelControl.Component
                                size="sm"
                                variant="outline-primary"
                                permissionLevel={this.props.permissionLevel}
                                disableBest={true}
                                onChange={this.onPermissionLevelChange}
                            />
                        </Col>
                    </Form.Group>

                    <hr />
                    <MakeRequest.Component />
                </Form>
            );
        }

        private readonly onPermissionLevelChange = (permissionLevel?: PermissionLevel) => {
            this.props.dispatchUpdateMetaData({ permissionLevel });
        };

        private readonly processSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();

            MakeRequest.initiate(
                "client.metaData.getSubscriptionInfo",
                `${this.props.permissionLevel}`,
                "MetaData.SubscriptionInfo",
                () => {
                    if (this.props.permissionLevel != null) {
                        this.props.client!.metaData.getSubscriptionInfo(this.props.permissionLevel);
                    }
                }
            );
        };
    }

    function mapStateToProps(state: AppState): ReduxStateProps {
        return {
            client: state.root.client,
            connectionState: state.root.connectionInfo.connectionState,
            permissionLevel: state.metaData.permissionLevel
        };
    }

    // Generate redux connected component.
    export const Component = connect(
        mapStateToProps,
        mapDispatchToProps
    )(ComponentImpl);
} // namespace GetSubscriptionInfo

export default GetSubscriptionInfo;
