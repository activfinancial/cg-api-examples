/*
 * GetIntraday controls.
 */

import * as React from "react";
import Form from "react-bootstrap/Form";
import Col from "react-bootstrap/Col";

import { labelColumnClass, inputColumnWidth } from "../../columnDefinitions";

import { TimeSeries } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

// State to be lifted up and managed elsewhere.
export interface LiftedState {
    intradayRecordFilterType: TimeSeries.IntradayRecordFilterType;
    intradayFieldFilterType: TimeSeries.IntradayFieldFilterType;
    intradayMinuteInterval?: number;
}

// Own props.
interface OwnProps {
    onChange: (newState: Partial<LiftedState>) => void;
    showSpecifiedMinuteInterval?: boolean;
}

// All props.
type Props = OwnProps & LiftedState;

export class Component extends React.PureComponent<Props> {
    render() {
        return (
            <div>
                {/* Specified interval. */}
                {this.props.showSpecifiedMinuteInterval && (
                    <Form.Group as={Form.Row} className="form-group-margin">
                        <Form.Label column className={`${labelColumnClass} text-right`}>
                            Number of minutes:
                        </Form.Label>
                        <Col sm={inputColumnWidth}>
                            <Form.Control
                                type="number"
                                size="sm"
                                value={`${this.props.intradayMinuteInterval}`}
                                onChange={this.onMinuteIntervalChange}
                            />
                        </Col>
                    </Form.Group>
                )}

                {/* Record filter. */}
                <Form.Group as={Form.Row} className="form-group-margin">
                    <Form.Label column className={`${labelColumnClass} text-right`}>
                        Record filter:
                    </Form.Label>
                    <Col sm={inputColumnWidth}>
                        <Form.Control
                            as="select"
                            size="sm"
                            value={TimeSeries.IntradayRecordFilterType[this.props.intradayRecordFilterType]}
                            onChange={this.onRecordFilterTypeChange}
                        >
                            <option value="none">No filtering</option>
                            <option value="regularTrades">Bars with regular trades</option>
                            <option value="ohlcBars">Bars with OHLC prices</option>
                        </Form.Control>
                    </Col>
                </Form.Group>

                {/* Field filter. */}
                <Form.Group as={Form.Row} className="form-group-margin">
                    <Form.Label column className={`${labelColumnClass} text-right`}>
                        Field filter:
                    </Form.Label>
                    <Col sm={inputColumnWidth}>
                        <Form.Control
                            as="select"
                            size="sm"
                            value={TimeSeries.IntradayFieldFilterType[this.props.intradayFieldFilterType]}
                            onChange={this.onFieldFilterTypeChange}
                        >
                            <option value="fullBar">Full bar</option>
                            <option value="miniBar">Mini bar</option>
                        </Form.Control>
                    </Col>
                </Form.Group>
            </div>
        );
    }

    private readonly onRecordFilterTypeChange = (e: any /* TODO proper type */) => {
        const intradayRecordFilterType =
            TimeSeries.IntradayRecordFilterType[e.target.value as keyof typeof TimeSeries.IntradayRecordFilterType];

        this.props.onChange({ intradayRecordFilterType });
    };

    private readonly onFieldFilterTypeChange = (e: any /* TODO proper type */) => {
        const intradayFieldFilterType =
            TimeSeries.IntradayFieldFilterType[e.target.value as keyof typeof TimeSeries.IntradayFieldFilterType];

        this.props.onChange({ intradayFieldFilterType });
    };

    private readonly onMinuteIntervalChange = (e: any /* TODO proper type */) => {
        if (this.props.showSpecifiedMinuteInterval) {
            const intradayMinuteInterval = e.target.valueAsNumber;

            this.props.onChange({ intradayMinuteInterval });
        }
    };
}
