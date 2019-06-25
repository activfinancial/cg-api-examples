/*
 * Streaming conflation parameters.
 */

import * as React from "react";
import { connect } from "react-redux";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import ToggleButton from "react-bootstrap/ToggleButton";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";

import * as ConflationTypeControl from "./conflationType";

import { AppState } from "../../state/store";
import { ConnectionInfo } from "../../connectionInfo";
import { labelColumnClass, inputColumnWidth } from "../../columnDefinitions";

// ---------------------------------------------------------------------------------------------------------------------------------

// State to be lifted up and managed elsewhere.
export interface LiftedState extends ConflationTypeControl.LiftedState {
    conflationInterval?: number;
    shouldEnableDynamicConflation?: boolean;
}

// Own props.
interface OwnProps {
    onChange: (newState: Partial<LiftedState>) => void;
}

// Redux state we'll see as props.
interface ReduxStateProps {
    connectionInfo: ConnectionInfo;
}

// All props.
type Props = OwnProps & LiftedState & ReduxStateProps;

class ComponentImpl extends React.PureComponent<Props> {
    render() {
        return (
            <>
                <Form.Group as={Form.Row} className="form-group-margin">
                    <Form.Label column className={`${labelColumnClass} text-right`}>
                        Conflation type:
                    </Form.Label>
                    <Col sm={inputColumnWidth}>
                        <ConflationTypeControl.Component
                            size="sm"
                            variant="outline-primary"
                            conflationType={this.props.conflationType}
                            onChange={this.props.onChange}
                        />
                    </Col>
                </Form.Group>

                {this.props.conflationType && (
                    <Form.Group as={Form.Row} className="form-group-margin">
                        <Form.Label column className={`${labelColumnClass} text-right`}>
                            Conflation interval:
                        </Form.Label>
                        <Col sm={inputColumnWidth}>
                            <Form.Control
                                type="number"
                                size="sm"
                                min="0"
                                max="4294967295"
                                value={`${this.props.conflationInterval}`}
                                required
                                onChange={this.onConflationIntervalChange}
                            />
                        </Col>
                    </Form.Group>
                )}

                {this.props.connectionInfo.isDynamicConflationAvailable && (
                    <Form.Group as={Form.Row} className="form-group-margin">
                        <Form.Label column className={`${labelColumnClass} text-right`} />
                        <Col sm={inputColumnWidth}>
                            <ButtonGroup toggle vertical className="btn-block" onChange={this.onEnableDynamicConflationChange}>
                                <ToggleButton
                                    type="checkbox"
                                    size="sm"
                                    variant="outline-primary"
                                    value={false}
                                    checked={this.props.shouldEnableDynamicConflation}
                                >
                                    Enable dynamic conflation?
                                </ToggleButton>
                            </ButtonGroup>
                        </Col>
                    </Form.Group>
                )}
            </>
        );
    }

    private readonly onConflationIntervalChange = (e: any /* TODO seems to be buggy TS defs */) => {
        const conflationInterval = e.target.valueAsNumber;

        this.props.onChange({ conflationInterval });
    };

    private readonly onEnableDynamicConflationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const enableDynamicConflation = e.target.checked;

        this.props.onChange({ shouldEnableDynamicConflation: enableDynamicConflation });
    };
}

function mapStateToProps(state: AppState): ReduxStateProps {
    return {
        connectionInfo: state.root.connectionInfo
    };
}

// Generate redux connected component.
export const Component = connect(mapStateToProps)(ComponentImpl);
