/*
 * GetFieldInfo controls.
 */

import * as React from "react";
import { connect } from "react-redux";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";

import * as MakeRequest from "../makeRequest";
import { ConnectionState } from "../../connectionInfo";
import * as FieldIdsControl from "../controls/fieldIdsControl";
import { labelColumnClass, inputColumnWidth } from "../../columnDefinitions";

import { AppState } from "../../state/store";
import { dispatchUpdateMetaData } from "../../state/actions/metaDataActions";

import { IClient } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

// State to be lifted up elsewhere (redux in our case).
export interface LiftedState extends FieldIdsControl.LiftedState {}

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
                {/* Field ids. */}
                <Form.Group as={Form.Row} className="form-group-margin">
                    <Form.Label column className={`${labelColumnClass} text-right`}>
                        Field id(s):
                    </Form.Label>
                    <Col sm={inputColumnWidth}>
                        <FieldIdsControl.Component
                            fieldIds={this.props.fieldIds}
                            placeholder="Field id per line; leave empty for info about all fields"
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

        if (this.props.fieldIds.length === 0) {
            this.makeGetUniversalFieldHelperListRequest();
        } else {
            this.makeGetUniversalFieldHelperRequest();
        }
    };

    private makeGetUniversalFieldHelperListRequest() {
        MakeRequest.initiate("client.metaData.getUniversalFieldHelperList", "", "MetaData.IUniversalFieldHelper[]", () =>
            this.props.client!.metaData.getUniversalFieldHelperList()
        );
    }

    private makeGetUniversalFieldHelperRequest() {
        for (const fieldId of this.props.fieldIds) {
            MakeRequest.initiate("client.metaData.getUniversalFieldHelper", `${fieldId}`, "MetaData.IUniversalFieldHelper", () =>
                this.props.client!.metaData.getUniversalFieldHelper(fieldId)
            );
        }
    }
}

function mapStateToProps(state: AppState): ReduxStateProps {
    return {
        client: state.root.client,
        connectionState: state.root.connectionInfo.connectionState,
        fieldIds: state.metaData.fieldIds
    };
}

// Generate redux connected component.
export const Component = connect(
    mapStateToProps,
    mapDispatchToProps
)(ComponentImpl);
