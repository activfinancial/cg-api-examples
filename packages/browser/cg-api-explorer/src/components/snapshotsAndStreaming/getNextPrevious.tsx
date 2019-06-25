/*
 * UI for GetNext/GetPrevious parameters.
 */

import * as React from "react";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";

import { labelColumnClass, inputColumnWidth } from "../../columnDefinitions";
import * as TableNumberControl from "../controls/tableNumberControl";

// ---------------------------------------------------------------------------------------------------------------------------------

// State to be lifted up and managed elsewhere.
export interface LiftedState extends TableNumberControl.LiftedState {
    symbol: string;
    numberOfRecords: number;
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
                        Table:
                    </Form.Label>
                    <Col sm={inputColumnWidth}>
                        <TableNumberControl.Component
                            tableNumber={this.props.tableNumber}
                            required
                            onChange={this.props.onChange}
                        />
                    </Col>
                </Form.Group>

                <Form.Group as={Form.Row} className="form-group-margin">
                    <Form.Label column className={`${labelColumnClass} text-right`}>
                        Symbol:
                    </Form.Label>
                    <Col sm={inputColumnWidth}>
                        <Form.Control type="text" size="sm" required value={this.props.symbol} onChange={this.onSymbolChange} />
                    </Col>
                </Form.Group>

                <Form.Group as={Form.Row} className="form-group-margin">
                    <Form.Label column className={`${labelColumnClass} text-right`}>
                        Number of records:
                    </Form.Label>
                    <Col sm={inputColumnWidth}>
                        <Form.Control
                            type="number"
                            size="sm"
                            min="1"
                            value={`${this.props.numberOfRecords}`}
                            onChange={this.onNumberOfRecordsChange}
                        />
                    </Col>
                </Form.Group>
            </div>
        );
    }

    private readonly onSymbolChange = (e: any /* TODO proper type */) => {
        const symbol = e.target.value;
        this.props.onChange({ symbol });
    };

    private readonly onNumberOfRecordsChange = (e: any /* TODO proper type */) => {
        const numberOfRecords = e.target.valueAsNumber || 1;

        this.props.onChange({ numberOfRecords });
    };
}
