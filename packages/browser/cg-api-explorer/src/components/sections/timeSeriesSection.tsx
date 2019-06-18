/*
 * Time series section.
 */

import * as React from "react";
import { connect } from "react-redux";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import Nav from "react-bootstrap/Nav";
import Tab from "react-bootstrap/Tab";
import ToggleButton from "react-bootstrap/ToggleButton";
import uuid from "uuid/v4";

import MakeRequest from "../makeRequest";
import CollapsibleSection from "./collapsibleSection";
import { ConnectionInfo } from "../../connectionInfo";
import SimpleTooltip from "../simpleTooltip";
import { labelColumnClass, inputColumnWidth } from "../../columnDefinitions";

import GetTicks from "../timeSeries/getTicks";
import GetIntraday from "../timeSeries/getIntraday";
import GetHistory from "../timeSeries/getHistory";
import Period from "../timeSeries/period";

import { AppState } from "../../store";
import { State as TimeSeriesState } from "../../reducers/timeSeriesReducer";
import {
    dispatchSetTimeSeriesTab,
    dispatchUpdateTimeSeries,
    dispatchAddPeriod,
    dispatchUpdatePeriod,
    dispatchRemovePeriod
} from "../../actions/timeSeriesActions";

import { Client, TimeSeries } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

namespace TimeSeriesSection {
    // Own props.
    interface OwnProps {}

    // Redux state we'll see as props.
    interface ReduxStateProps {
        client: Client | null;
        connectionInfo: ConnectionInfo;

        // Note rather than ReduxStateProps extending TimeSeriesState, have it as a property.
        // The fact that TimeSeriesState has a "key" property seems to break things at runtime.
        timeSeries: TimeSeriesState;
    }

    // Redux dispatch functions we use.
    const mapDispatchToProps = {
        dispatchSetTimeSeriesTab,
        dispatchUpdateTimeSeries,
        dispatchAddPeriod,
        dispatchUpdatePeriod,
        dispatchRemovePeriod
    };

    // All props.
    type Props = OwnProps & ReduxStateProps & typeof mapDispatchToProps;

    interface MakeRequestParameters {
        (): TimeSeries.AllRequestParameters;
    }

    /** Request parameter builders keyed by request name. */
    type RequestParametersBuilder = {
        [eventKey: string]: {
            requestName: TimeSeries.AllRequestNames;
            recordName: string;
            fn: MakeRequestParameters;
        };
    };

    class ComponentImpl extends React.PureComponent<Props> {
        constructor(props: Props) {
            super(props);

            this.requestParametersBuilder = {
                getTicks: { requestName: "getTicks", recordName: "Tick", fn: () => this.makeGetTicksRequestParameters() },

                getIntraday1: {
                    requestName: "getIntraday",
                    recordName: "IntradayBar",
                    fn: () => this.makeGetIntradayRequestParameters(TimeSeries.IntradaySeriesType.oneMinuteBars)
                },
                getIntraday5: {
                    requestName: "getIntraday",
                    recordName: "IntradayBar",
                    fn: () => this.makeGetIntradayRequestParameters(TimeSeries.IntradaySeriesType.fiveMinuteBars)
                },
                getIntradayN: {
                    requestName: "getIntraday",
                    recordName: "IntradayBar",
                    fn: () => this.makeGetIntradayRequestParameters(TimeSeries.IntradaySeriesType.specifiedMinuteBars)
                },

                getHistoryDaily: {
                    requestName: "getHistory",
                    recordName: "HistoryBar",
                    fn: () => this.makeGetHistoryRequestParameters(TimeSeries.HistorySeriesType.dailyBars)
                },
                getHistoryWeekly: {
                    requestName: "getHistory",
                    recordName: "HistoryBar",
                    fn: () => this.makeGetHistoryRequestParameters(TimeSeries.HistorySeriesType.weeklyBars)
                },
                getHistoryMonthly: {
                    requestName: "getHistory",
                    recordName: "HistoryBar",
                    fn: () => this.makeGetHistoryRequestParameters(TimeSeries.HistorySeriesType.monthlyBars)
                }
            };
        }

        render() {
            return (
                <Col>
                    <CollapsibleSection.Component title="TimeSeries" initialCollapseState={true}>
                        {this.props.connectionInfo.isHistoryServiceAvailable ? (
                            /* Note we're not using the <Tabs> component for two reasons:
                            1. To allow <SimpleTooltip> on the tab header itself.
                            2. To allow a single common section, rather than rendering a different one per tab
                            (and then having to pass its state up so each copy looks then same). */
                            <Tab.Container
                                id={`${this.id}-tabs`}
                                defaultActiveKey={this.props.timeSeries.activeTab}
                                transition={false}
                            >
                                <Nav variant="tabs" onSelect={this.props.dispatchSetTimeSeriesTab}>
                                    <SimpleTooltip text="Tick series">
                                        <Nav.Item>
                                            <Nav.Link eventKey="getTicks">Ticks</Nav.Link>
                                        </Nav.Item>
                                    </SimpleTooltip>

                                    <SimpleTooltip text="One minute intraday bars">
                                        <Nav.Item>
                                            <Nav.Link eventKey="getIntraday1">1 minute</Nav.Link>
                                        </Nav.Item>
                                    </SimpleTooltip>

                                    <SimpleTooltip text="Five minute intraday bars">
                                        <Nav.Item>
                                            <Nav.Link eventKey="getIntraday5">5 minute</Nav.Link>
                                        </Nav.Item>
                                    </SimpleTooltip>

                                    <SimpleTooltip text="Intraday bars with a specified minute interval">
                                        <Nav.Item>
                                            <Nav.Link eventKey="getIntradayN">n minute</Nav.Link>
                                        </Nav.Item>
                                    </SimpleTooltip>

                                    <SimpleTooltip text="Daily bars">
                                        <Nav.Item>
                                            <Nav.Link eventKey="getHistoryDaily">Daily</Nav.Link>
                                        </Nav.Item>
                                    </SimpleTooltip>

                                    <SimpleTooltip text="Weekly bars">
                                        <Nav.Item>
                                            <Nav.Link eventKey="getHistoryWeekly">Weekly</Nav.Link>
                                        </Nav.Item>
                                    </SimpleTooltip>

                                    <SimpleTooltip text="Monthly bars">
                                        <Nav.Item>
                                            <Nav.Link eventKey="getHistoryMonthly">Monthly</Nav.Link>
                                        </Nav.Item>
                                    </SimpleTooltip>
                                </Nav>

                                <Card body bg="light">
                                    <Form onSubmit={this.processSubmit}>
                                        <Tab.Content>
                                            {/* I'm not sure this is really cricket, but if we render the inactive tabs
                                            then any required fields on the inactive tabs will stop the active tab
                                            from working with an odd error in the console (since presumably it can't
                                            render the normal please-fill-in-this-field popup). */}

                                            {/* GetTicks. */}
                                            {this.props.timeSeries.activeTab === "getTicks" && (
                                                <Tab.Pane eventKey="getTicks">
                                                    <GetTicks.Component
                                                        tickRecordFilterType={this.props.timeSeries.tickRecordFilterType}
                                                        onChange={this.props.dispatchUpdateTimeSeries}
                                                    />
                                                </Tab.Pane>
                                            )}

                                            {/* GetIntraday 1 minute. */}
                                            {this.props.timeSeries.activeTab === "getIntraday1" && (
                                                <Tab.Pane eventKey="getIntraday1">
                                                    <GetIntraday.Component
                                                        intradayRecordFilterType={this.props.timeSeries.intradayRecordFilterType}
                                                        intradayFieldFilterType={this.props.timeSeries.intradayFieldFilterType}
                                                        onChange={this.props.dispatchUpdateTimeSeries}
                                                    />
                                                </Tab.Pane>
                                            )}

                                            {/* GetIntraday 5 minute. */}
                                            {this.props.timeSeries.activeTab === "getIntraday5" && (
                                                <Tab.Pane eventKey="getIntraday5">
                                                    <GetIntraday.Component
                                                        intradayRecordFilterType={this.props.timeSeries.intradayRecordFilterType}
                                                        intradayFieldFilterType={this.props.timeSeries.intradayFieldFilterType}
                                                        onChange={this.props.dispatchUpdateTimeSeries}
                                                    />
                                                </Tab.Pane>
                                            )}

                                            {/* GetIntraday n minute. */}
                                            {this.props.timeSeries.activeTab === "getIntradayN" && (
                                                <Tab.Pane eventKey="getIntradayN">
                                                    <GetIntraday.Component
                                                        intradayRecordFilterType={this.props.timeSeries.intradayRecordFilterType}
                                                        intradayFieldFilterType={this.props.timeSeries.intradayFieldFilterType}
                                                        intradayMinuteInterval={this.props.timeSeries.intradayMinuteInterval}
                                                        onChange={this.props.dispatchUpdateTimeSeries}
                                                        showSpecifiedMinuteInterval={true}
                                                    />
                                                </Tab.Pane>
                                            )}

                                            {/* GetHistory daily. */}
                                            {this.props.timeSeries.activeTab === "getHistoryDaily" && (
                                                <Tab.Pane eventKey="getHistoryDaily">
                                                    <GetHistory.Component
                                                        historyFieldFilterType={this.props.timeSeries.historyFieldFilterType}
                                                        onChange={this.props.dispatchUpdateTimeSeries}
                                                    />
                                                </Tab.Pane>
                                            )}

                                            {/* GetHistory weekly. */}
                                            {this.props.timeSeries.activeTab === "getHistoryWeekly" && (
                                                <Tab.Pane eventKey="getHistoryWeekly">
                                                    <GetHistory.Component
                                                        historyFieldFilterType={this.props.timeSeries.historyFieldFilterType}
                                                        onChange={this.props.dispatchUpdateTimeSeries}
                                                    />
                                                </Tab.Pane>
                                            )}

                                            {/* GetHistory monthly. */}
                                            {this.props.timeSeries.activeTab === "getHistoryMonthly" && (
                                                <Tab.Pane eventKey="getHistoryMonthly">
                                                    <GetHistory.Component
                                                        historyFieldFilterType={this.props.timeSeries.historyFieldFilterType}
                                                        onChange={this.props.dispatchUpdateTimeSeries}
                                                    />
                                                </Tab.Pane>
                                            )}
                                        </Tab.Content>

                                        {/* Common controls. */}
                                        <hr />

                                        {/* Symbol. */}
                                        <Form.Group as={Form.Row} className="form-group-margin">
                                            <Form.Label column className={`${labelColumnClass} text-right`}>
                                                Symbol:
                                            </Form.Label>
                                            <Col sm={inputColumnWidth}>
                                                <Form.Control
                                                    type="text"
                                                    size="sm"
                                                    value={this.props.timeSeries.key}
                                                    required
                                                    onChange={this.onSymbolChange}
                                                />
                                            </Col>
                                        </Form.Group>

                                        {/* Youngest first? */}
                                        <Form.Group as={Form.Row} className="form-group-margin">
                                            <Form.Label column className={`${labelColumnClass} text-right`} />
                                            <Col sm={inputColumnWidth}>
                                                <ButtonGroup toggle vertical className="btn-block">
                                                    <ToggleButton
                                                        type="checkbox"
                                                        size="sm"
                                                        variant="outline-primary"
                                                        value={true}
                                                        checked={this.props.timeSeries.youngestFirst}
                                                        onChange={this.onYoungestFirstChange}
                                                    >
                                                        Return youngest field sets first?
                                                    </ToggleButton>
                                                </ButtonGroup>
                                            </Col>
                                        </Form.Group>

                                        {/* Periods. */}
                                        <Form.Group as={Form.Row} className="form-group-margin">
                                            <div className={labelColumnClass}>
                                                <Form.Row>
                                                    <Form.Label column className="text-right">
                                                        Periods:
                                                    </Form.Label>
                                                </Form.Row>
                                                {/* TODO not aligned with label on right... */}
                                                <Form.Row className="float-right">
                                                    <SimpleTooltip text="Add another period">
                                                        <Button
                                                            variant="outline-secondary"
                                                            size="sm"
                                                            className="float-right"
                                                            onClick={this.props.dispatchAddPeriod}
                                                        >
                                                            <span className="fas fa-plus" />
                                                        </Button>
                                                    </SimpleTooltip>
                                                </Form.Row>
                                            </div>
                                            <Col sm={inputColumnWidth}>
                                                {this.props.timeSeries.periods.map((period, index) => (
                                                    <Period.Component
                                                        key={period.key}
                                                        type={period.type}
                                                        date={period.date}
                                                        count={period.count}
                                                        // Spacing between relationships.
                                                        className={index < this.props.timeSeries.periods.length - 1 ? "mb-1" : ""}
                                                        onChange={(newPeriod: Partial<Period.LiftedState>) =>
                                                            this.props.dispatchUpdatePeriod(period.key, newPeriod)
                                                        }
                                                        onRemove={
                                                            this.props.timeSeries.periods.length > 2
                                                                ? () => this.props.dispatchRemovePeriod(period.key)
                                                                : undefined
                                                        }
                                                    />
                                                ))}
                                            </Col>
                                        </Form.Group>

                                        <hr />
                                        <MakeRequest.Component />
                                    </Form>
                                </Card>
                            </Tab.Container>
                        ) : (
                            "Time series not available."
                        )}
                    </CollapsibleSection.Component>
                </Col>
            );
        }

        private readonly onSymbolChange = (e: any /* TODO proper type. */) => {
            this.props.dispatchUpdateTimeSeries({ key: e.target.value });
        };

        private readonly onYoungestFirstChange = (e: any /* TODO proper type. */) => {
            this.props.dispatchUpdateTimeSeries({ youngestFirst: e.target.checked });
        };

        private readonly processSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();

            const builder = this.requestParametersBuilder[this.props.timeSeries.activeTab];
            if (builder == null) {
                return;
            }

            const { requestName } = builder;
            const requestParameters = builder.fn();

            // TODO be nice to get rid of the anys.
            MakeRequest.initiateAsyncIterable<any>(
                `client.timeSeries.${requestName}`,
                JSON.stringify(requestParameters, null, 2),
                `TimeSeries.${builder.recordName}`,
                () => this.props.client!.timeSeries[requestName](requestParameters as any)
            );
        };

        private setCommonParameters(requestParameters: Partial<TimeSeries.RequestParameters>) {
            requestParameters.key = this.props.timeSeries.key;
            requestParameters.periods = this.props.timeSeries.periods;
            requestParameters.youngestFirst = this.props.timeSeries.youngestFirst;
        }

        private makeGetTicksRequestParameters() {
            const requestParameters: Partial<TimeSeries.TickRequestParameters> = {
                recordFilterType: this.props.timeSeries.tickRecordFilterType
            };

            this.setCommonParameters(requestParameters);

            return requestParameters as TimeSeries.TickRequestParameters;
        }

        private makeGetIntradayRequestParameters(seriesType: TimeSeries.IntradaySeriesType) {
            const requestParameters: Partial<TimeSeries.IntradayRequestParameters> = {
                seriesType,
                recordFilterType: this.props.timeSeries.intradayRecordFilterType,
                fieldFilterType: this.props.timeSeries.intradayFieldFilterType,
                minuteInterval: this.props.timeSeries.intradayMinuteInterval
            };

            this.setCommonParameters(requestParameters);

            return requestParameters as TimeSeries.IntradayRequestParameters;
        }

        private makeGetHistoryRequestParameters(seriesType: TimeSeries.HistorySeriesType) {
            const requestParameters: Partial<TimeSeries.HistoryRequestParameters> = {
                seriesType,
                fieldFilterType: this.props.timeSeries.historyFieldFilterType
            };

            this.setCommonParameters(requestParameters);

            return requestParameters as TimeSeries.HistoryRequestParameters;
        }

        private readonly id = uuid();
        private readonly requestParametersBuilder: RequestParametersBuilder;
    }

    function mapStateToProps(state: AppState): ReduxStateProps {
        return {
            client: state.root.client,
            connectionInfo: state.root.connectionInfo,
            timeSeries: state.timeSeries
        };
    }

    // Generate redux connected component.
    export const Component = connect(
        mapStateToProps,
        mapDispatchToProps
    )(ComponentImpl);
} // namespacde TimeSeriesSection

export default TimeSeriesSection;
