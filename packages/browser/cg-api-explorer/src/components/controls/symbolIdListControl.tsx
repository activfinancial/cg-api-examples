/*
 * SymbolIdListControl.
 */

import * as React from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";

import SymbolIdControl from "./symbolIdControl";
import SimpleTooltip from "../simpleTooltip";
import { labelColumnClass, inputColumnWidth } from "../../columnDefinitions";

import { Streaming } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

// SymbolId with key field to keep react happy.
interface KeyedSymbolId extends Streaming.ISymbolId {
    key: string;
}

// State to be lifted up and managed elsewhere.
export interface LiftedState {
    symbolIdList: KeyedSymbolId[];
}

// Own props.
interface OwnProps {
    className?: string;
    placeholder?: string;
    required?: boolean;

    addSymbolId: () => void;
    updateSymbolId: (key: string, symbolId: Partial<Streaming.ISymbolId>) => void;
    removeSymbolId: (key: string) => void;
}

// All props.
type Props = OwnProps & LiftedState;

export class Component extends React.Component<Props> {
    render() {
        return (
            <Form.Group as={Form.Row} className="form-group-margin">
                <div className={labelColumnClass}>
                    <Form.Row>
                        <Form.Label column className="text-right">
                            Symbol patterns:
                        </Form.Label>
                    </Form.Row>
                    {/* TODO not aligned with label on right... */}
                    <Form.Row className="float-right">
                        <SimpleTooltip text="Add another">
                            <Button variant="outline-secondary" size="sm" className="float-right" onClick={this.props.addSymbolId}>
                                <span className="fas fa-plus" />
                            </Button>
                        </SimpleTooltip>
                    </Form.Row>
                </div>
                <Col sm={inputColumnWidth}>
                    {this.props.symbolIdList.map((symbolId, index) => (
                        // TODO need to put a key prop in here to stop warnings
                        <Card
                            body
                            bg="light"
                            className={`${this.props.className} ${index < this.props.symbolIdList.length - 1 ? "mb-1" : ""}`}
                        >
                            <SymbolIdControl
                                symbolId={symbolId}
                                placeholder={this.props.placeholder}
                                required={this.props.required}
                                onChange={(newSymbolId: Partial<Streaming.ISymbolId>) =>
                                    this.props.updateSymbolId(symbolId.key, newSymbolId)
                                }
                                onRemove={
                                    this.props.symbolIdList.length > 1 ? () => this.props.removeSymbolId(symbolId.key) : undefined
                                }
                            />
                        </Card>
                    ))}
                </Col>
            </Form.Group>
        );
    }
}
