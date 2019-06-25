/*
 * UI for GetEqual parameters.
 */

import * as React from "react";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";

import * as SymbolListControl from "../controls/symbolListControl";
import { labelColumnClass, inputColumnWidth } from "../../columnDefinitions";

// ---------------------------------------------------------------------------------------------------------------------------------

// State to be lifted up and managed elsewhere.
export interface LiftedState extends SymbolListControl.LiftedState {}

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
                    </Col>
                </Form.Group>
            </div>
        );
    }
}
