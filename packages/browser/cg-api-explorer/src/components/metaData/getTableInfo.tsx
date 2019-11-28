/*
 * GetTableInfo controls.
 */

import * as React from "react";
import { connect } from "react-redux";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";

import * as MakeRequest from "../makeRequest";
import { ConnectionState } from "../../connectionInfo";
import * as TableNumberControl from "../controls/tableNumberControl";
import { Component as PermissionLevelControl } from "../controls/permissionLevelControl";
import { labelColumnClass, inputColumnWidth } from "../../columnDefinitions";

import { AppState } from "../../state/store";
import { dispatchUpdateMetaData } from "../../state/actions/metaDataActions";

import { IClient, PermissionLevel } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

// State to be lifted up elsewhere (redux in our case).
export interface LiftedState extends TableNumberControl.LiftedState {
    permissionLevel: PermissionLevel;
}

// Own props.
interface OwnProps {}

// Redux state we'll see as props.
interface ReduxStateProps extends LiftedState {
    client: IClient | null;
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
                {/* Table number. */}
                <Form.Group as={Form.Row} className="form-group-margin">
                    <Form.Label column className={`${labelColumnClass} text-right`}>
                        Table number:
                    </Form.Label>
                    <Col sm={inputColumnWidth}>
                        <TableNumberControl.Component
                            tableNumber={this.props.tableNumber}
                            placeholder="Leave empty for summary info about all tables"
                            onChange={this.props.dispatchUpdateMetaData}
                        />
                    </Col>
                </Form.Group>

                {/* Permission level. */}
                <Form.Group as={Form.Row} className="form-group-margin">
                    <Form.Label column className={`${labelColumnClass} text-right`}>
                        Permission level:
                    </Form.Label>
                    <Col sm={inputColumnWidth}>
                        <PermissionLevelControl
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

    private readonly processSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        this.makeRequest();
    };

    private makeRequest() {
        if (this.props.tableNumber == null) {
            this.makeGetTableInfoListRequest();
        } else {
            this.makeGetTableSpecificationRequest();
        }
    }

    private makeGetTableInfoListRequest() {
        MakeRequest.initiate("client.metaData.getTableInfoList", `${this.props.permissionLevel}`, "MetaData.ITableInfoList", () =>
            this.props.client!.metaData.getTableInfoList(this.props.permissionLevel)
        );
    }

    private makeGetTableSpecificationRequest() {
        MakeRequest.initiate(
            "client.metaData.getTableSpecification",
            `${this.props.permissionLevel}, ${this.props.tableNumber}`,
            "MetaData.ITableSpecification",
            () => this.props.client!.metaData.getTableSpecification(this.props.permissionLevel, this.props.tableNumber!)
        );
    }
}

function mapStateToProps(state: AppState): ReduxStateProps {
    return {
        client: state.root.client,
        connectionState: state.root.connectionInfo.connectionState,
        tableNumber: state.metaData.tableNumber,
        permissionLevel: state.metaData.permissionLevel
    };
}

// Generate redux connected component.
export const Component = connect(
    mapStateToProps,
    mapDispatchToProps
)(ComponentImpl);
