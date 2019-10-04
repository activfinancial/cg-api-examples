/*
 * SymbolIdControl.
 */

import * as React from "react";
import Button from "react-bootstrap/Button";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";

import { Component as TableNumberControl } from "./tableNumberControl";
import SimpleTooltip from "../simpleTooltip";

import { Streaming } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

// State to be lifted up and managed elsewhere.
interface LiftedState {
    symbolId: Streaming.ISymbolId;
}

// Own props.
interface OwnProps {
    placeholder?: string;
    required?: boolean;
    onRemove?: () => void;
    onChange: (symbolId: Partial<Streaming.ISymbolId>) => void;
}

// All props.
type Props = OwnProps & LiftedState;

class Component extends React.Component<Props> {
    render() {
        return (
            <div>
                <Form.Group as={Form.Row} className="form-group-margin">
                    <Col md={5}>
                        <TableNumberControl
                            tableNumber={this.props.symbolId.tableNumber}
                            required={this.props.required}
                            // TODO sort out undefined for table number.
                            onChange={this.props.onChange}
                        />
                    </Col>

                    <Col md={5}>
                        <Form.Control
                            type="text"
                            size="sm"
                            value={this.props.symbolId.symbol}
                            placeholder={this.props.placeholder ? this.props.placeholder : "Symbol"}
                            required={this.props.required}
                            onChange={this.onSymbolChange}
                        />
                    </Col>
                    <Col md={2}>
                        <SimpleTooltip text="Remove">
                            <Button
                                size="sm"
                                variant="outline-secondary"
                                className="float-right"
                                disabled={!this.props.onRemove}
                                onClick={this.props.onRemove}
                            >
                                <span className="fas fa-trash-alt" />
                            </Button>
                        </SimpleTooltip>
                    </Col>
                </Form.Group>
            </div>
        );
    }

    private readonly onSymbolChange = (e: any /* TODO proper type */) => {
        const symbol = e.target.value;
        this.props.onChange({ symbol });
    };
}

export default Component;
