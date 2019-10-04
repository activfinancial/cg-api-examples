/*
 * UI for GetPattern parameters.
 */

import * as React from "react";
import ToggleButton from "react-bootstrap/ToggleButton";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";

import * as SymbolIdListControl from "../controls/symbolIdListControl";
import { labelColumnClass, inputColumnWidth } from "../../columnDefinitions";

import { Streaming } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

// State to be lifted up and managed elsewhere.
export interface LiftedState extends SymbolIdListControl.LiftedState {
    reverseOrder: boolean;
}

// Own props.
interface OwnProps {
    addSymbolId: () => void;
    removeSymbolId: (key: string) => void;
    updateSymbolId: (key: string, symbolId: Partial<Streaming.ISymbolId>) => void;
    onChange: (newState: Partial<LiftedState>, shouldSubmit?: boolean) => void;
}

// All props.
type Props = OwnProps & LiftedState;

export class Component extends React.Component<Props> {
    render() {
        return (
            <div>
                <SymbolIdListControl.Component
                    symbolIdList={this.props.symbolIdList}
                    placeholder="Pattern"
                    required
                    addSymbolId={this.props.addSymbolId}
                    updateSymbolId={this.props.updateSymbolId}
                    removeSymbolId={this.props.removeSymbolId}
                />

                <Form.Group as={Form.Row} className="form-group-margin">
                    <Form.Label column className={`${labelColumnClass} text-right`} />
                    <Col sm={inputColumnWidth}>
                        <ButtonGroup toggle vertical className="btn-block" onChange={this.onReverseOrderChange}>
                            <ToggleButton
                                type="checkbox"
                                size="sm"
                                variant="outline-primary"
                                value={true}
                                checked={this.props.reverseOrder}
                            >
                                Reverse order
                            </ToggleButton>
                        </ButtonGroup>
                    </Col>
                </Form.Group>
            </div>
        );
    }

    private readonly onReverseOrderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        this.props.onChange({ reverseOrder: e.target.checked });
    };
}
