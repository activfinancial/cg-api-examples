/*
 * Period controls.
 */

import * as React from "react";
import Button from "react-bootstrap/Button";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";

import SimpleTooltip from "../simpleTooltip";

import { TimeSeries } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

function dateToISOString(date: Date) {
    return date.toISOString().split("T")[0];
}

function timeToISOString(date: Date) {
    return date
        .toISOString()
        .split("T")[1]
        .slice(0, -1);
}

// State to be lifted up and managed elsewhere.
export interface LiftedState extends TimeSeries.Period {
    key: string;
}

// Own props.
interface OwnProps {
    className?: string;
    onChange: (period: Partial<LiftedState>) => void;
    onRemove?: () => void;
}

// All props.
type Props = OwnProps & LiftedState;

export class Component extends React.PureComponent<Props> {
    render() {
        const showCount =
            this.props.type === TimeSeries.PeriodType.tradingDayCount || this.props.type === TimeSeries.PeriodType.dataPointCount;

        const showDateTime =
            this.props.type === TimeSeries.PeriodType.localDateTime || this.props.type === TimeSeries.PeriodType.utcDateTime;

        return (
            <Card body bg="light" className={this.props.className}>
                <Form.Group as={Form.Row} className="form-group-margin">
                    <Col md={10}>
                        <Form.Control
                            as="select"
                            value={TimeSeries.PeriodType[this.props.type]}
                            size="sm"
                            onChange={this.onTypeChange}
                        >
                            <option value="now">Present time</option>
                            <option value="localDateTime">Local date-time</option>
                            <option value="utcDateTime">UTC date-time</option>
                            <option value="tradingDayCount">Trading days</option>
                            <option value="dataPointCount">Data points</option>
                        </Form.Control>
                    </Col>

                    <Col md={2}>
                        <SimpleTooltip text="Remove period">
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

                {/* Count. */}
                {showCount && (
                    <Form.Group as={Form.Row} className="form-group-margin">
                        <Col md={10}>
                            <Form.Control
                                type="number"
                                size="sm"
                                value={this.props.count != null ? this.props.count.toString() : ""}
                                min={1}
                                placeholder="Count"
                                required
                                onChange={this.onCountChange}
                            />
                        </Col>
                    </Form.Group>
                )}

                {/* Date & time. */}
                {showDateTime && (
                    <Form.Group as={Form.Row} className="form-group-margin">
                        <Col md={10}>
                            <Form.Label column className="text-right col-sm-5">
                                Date:
                            </Form.Label>
                            <Col sm={7} className="float-right pl-0 pr-0">
                                <Form.Control
                                    type="date"
                                    size="sm"
                                    value={this.props.date != null ? dateToISOString(this.props.date) : ""}
                                    required
                                    onChange={this.onDateChange}
                                />
                            </Col>

                            <Form.Label column className="text-right col-sm-5">
                                Time:
                            </Form.Label>
                            <Col sm={7} className="float-right pl-0 pr-0">
                                <Form.Control
                                    type="time"
                                    size="sm"
                                    step="1"
                                    value={this.props.date != null ? timeToISOString(this.props.date) : ""}
                                    required
                                    onChange={this.onTimeChange}
                                />
                            </Col>
                        </Col>
                    </Form.Group>
                )}
            </Card>
        );
    }

    private readonly onTypeChange = (e: any /* TODO proper type */) => {
        const type: TimeSeries.PeriodType = TimeSeries.PeriodType[e.target.value as keyof typeof TimeSeries.PeriodType];

        this.props.onChange({ type });
    };

    private readonly onCountChange = (e: any /* TODO proper type */) => {
        const count = e.target.valueAsNumber;

        this.props.onChange({ count });
    };

    private readonly onDateChange = (e: any /* TODO proper type */) => {
        // TODO need a decent non-query react-bootstrap datetime picker!
        if (e.target.valueAsDate == null) {
            this.props.onChange({ date: undefined });
            return;
        }

        // If no time, assumes midnight.
        const dateStr = e.target.valueAsDate.toDateString();
        const timeStr = this.props.date == null ? e.target.valueAsDate.toTimeString() : this.props.date.toTimeString();
        const date = new Date(`${dateStr} ${timeStr}`);

        this.props.onChange({ date });
    };

    private readonly onTimeChange = (e: any /* TODO proper type */) => {
        // TODO need a decent non-query react-bootstrap datetime picker!
        if (e.target.valueAsDate == null) {
            this.props.onChange({ date: undefined });
            return;
        }

        // If no date, assumes epoch.
        const dateStr = this.props.date == null ? e.target.valueAsDate.toDateString() : this.props.date.toDateString();
        const timeStr = e.target.valueAsDate.toTimeString();
        const date = new Date(`${dateStr} ${timeStr}`);

        this.props.onChange({ date });
    };
}
