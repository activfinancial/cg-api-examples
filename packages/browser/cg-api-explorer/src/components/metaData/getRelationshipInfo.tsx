/*
 * GetRelationshipInfo controls.
 */

import * as React from "react";
import { connect } from "react-redux";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";

import * as MakeRequest from "../makeRequest";
import { ConnectionState } from "../../connectionInfo";
import * as TableNumberControl from "../controls/tableNumberControl";
import { labelColumnClass, inputColumnWidth } from "../../columnDefinitions";

import { AppState } from "../../state/store";
import { dispatchUpdateMetaData } from "../../state/actions/metaDataActions";

import { Client } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

// State to be lifted up elsewhere (redux in our case).
export interface LiftedState extends TableNumberControl.LiftedState {}

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
                {/* Table number. */}
                <Form.Group as={Form.Row} className="form-group-margin">
                    <Form.Label column className={`${labelColumnClass} text-right`}>
                        Table number:
                    </Form.Label>
                    <Col sm={inputColumnWidth}>
                        <TableNumberControl.Component
                            tableNumber={this.props.tableNumber}
                            placeholder="Leave empty for info about all relationships"
                            onChange={this.props.dispatchUpdateMetaData}
                        />
                    </Col>
                </Form.Group>

                <hr />
                <MakeRequest.Component />
            </Form>
        );
    }

    private readonly processSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        MakeRequest.initiate(
            "client.metaData.getRelationshipInfoList",
            `${this.props.tableNumber}`,
            "MetaData.RelationshipInfoList",
            () => this.props.client!.metaData.getRelationshipInfoList(this.props.tableNumber)
        );
    };
}

function mapStateToProps(state: AppState): ReduxStateProps {
    return {
        client: state.root.client,
        connectionState: state.root.connectionInfo.connectionState,
        tableNumber: state.metaData.tableNumber
    };
}

// Generate redux connected component.
export const Component = connect(
    mapStateToProps,
    mapDispatchToProps
)(ComponentImpl);
