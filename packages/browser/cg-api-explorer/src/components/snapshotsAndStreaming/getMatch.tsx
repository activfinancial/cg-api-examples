/*
 * UI for GetMatch parameters.
 */

import * as React from "react";
import ToggleButton from "react-bootstrap/ToggleButton";
import ToggleButtonGroup from "react-bootstrap/ToggleButtonGroup";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";
import uuid from "uuid/v4";

import * as SymbolListControl from "../controls/symbolListControl";
import { labelColumnClass, inputColumnWidth } from "../../columnDefinitions";

import { Streaming } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

// State to be lifted up and managed elsewhere.
export interface LiftedState extends SymbolListControl.LiftedState {
    matchType: Streaming.GetMatchType;
    alwaysGetMatch: boolean;
}

// Own props.
interface OwnProps {
    onChange: (newState: Partial<LiftedState>, shouldSubmit?: boolean) => void;
}

// All props.
type Props = OwnProps & LiftedState;

export class Component extends React.Component<Props> {
    render() {
        return (
            <div>
                <Form.Group as={Form.Row} className="form-group-margin">
                    <Form.Label column className={`${labelColumnClass} text-right`}>
                        Symbol(s):
                    </Form.Label>
                    <Col sm={inputColumnWidth}>
                        <SymbolListControl.Component symbolList={this.props.symbolList} onChange={this.props.onChange} />
                        <Form.Text className="text-muted">Exchange codes are optional</Form.Text>
                    </Col>
                </Form.Group>

                <Form.Group as={Form.Row} className="form-group-margin">
                    <Form.Label column className={`${labelColumnClass} text-right`}>
                        Match type:
                    </Form.Label>
                    <Col sm={inputColumnWidth}>
                        <ToggleButtonGroup
                            toggle
                            vertical
                            type="radio"
                            className="btn-block"
                            name={this.id}
                            value={this.props.matchType}
                            onChange={this.onMatchTypeChange}
                        >
                            <ToggleButton variant="outline-primary" size="sm" value={Streaming.GetMatchType.composite}>
                                Composite exchange
                            </ToggleButton>

                            <ToggleButton variant="outline-primary" size="sm" value={Streaming.GetMatchType.primary}>
                                Primary exchange
                            </ToggleButton>
                        </ToggleButtonGroup>

                        <ButtonGroup toggle vertical className="btn-block" onChange={this.onAlwaysGetMatchChange}>
                            <ToggleButton
                                type="checkbox"
                                size="sm"
                                variant="outline-primary"
                                value={true}
                                checked={this.props.alwaysGetMatch}
                            >
                                Always try requested match type?
                            </ToggleButton>
                        </ButtonGroup>
                        <Form.Text className="text-muted" style={{ textAlign: "center" }}>
                            (even if exact requested symbol exists)
                        </Form.Text>
                    </Col>
                </Form.Group>
            </div>
        );
    }

    private readonly onMatchTypeChange = (matchType: Streaming.GetMatchType) => {
        this.props.onChange({ matchType });
    };

    private readonly onAlwaysGetMatchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.props.onChange({ alwaysGetMatch: e.target.checked });
    };

    private readonly id = uuid();
}
