/*
 * News section.
 */

import * as React from "react";
import { connect } from "react-redux";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";
import ToggleButton from "react-bootstrap/ToggleButton";
import uuid from "uuid/v4";

import MakeRequest from "../makeRequest";
import CollapsibleSection from "./collapsibleSection";
import PermissionLevelControl from "../controls/permissionLevelControl";
import FieldIdsControl from "../controls/fieldIdsControl";
import { ConnectionInfo } from "../../connectionInfo";
import { labelColumnClass, inputColumnWidth } from "../../columnDefinitions";
import SimpleTooltip from "../simpleTooltip";
import { formatDate, renderUpdate } from "../../outputFormatters";

import { AppState } from "../../state/store";
import { State as NewsState } from "../../state/reducers/newsReducer";
import { dispatchUpdateNews } from "../../state/actions/newsActions";
import { dispatchAddSubscriptionInfo, dispatchRemoveSubscriptionInfo } from "../../state/actions/subscriptionManagementActions";

import { Client, News, PermissionLevel } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

const newsQueryTooltip =
    '<p align="left">' +
    "Basic news query format is <samp><b>&lt;tag&gt;=&lt;value&gt;</samp></b><br />" +
    "To retrieve every story, use <samp><b>*</samp></b> (an asterisk)<br />" +
    "Operators are: <samp><b>AND OR NOT ( )</samp></b><br />" +
    "  e.g. <samp><b>body=(microsoft OR apple) AND NOT body=ibm</samp></b><br />" +
    "  n.b. <samp><b>NOT</samp></b> operators can only be <samp><b>AND</samp></b>ed<br />" +
    "<br />" +
    "Valid tags are: <samp><b>body cat head magazine newssymbol supplier symbol</samp></b><br />" +
    "  <samp><b>body</samp></b> used to query the news story body<br />" +
    "  <samp><b>cat</samp></b> used to query the catagory code<br />" +
    "  <samp><b>head</samp></b> used to query headlines<br />" +
    "  <samp><b>magazine</samp></b> used to query magazine<br />" +
    "  <samp><b>newssymbol</samp></b> is the actual symbol of a story<br />" +
    "  <samp><b>supplier</samp></b> used to query the supplier of the story<br />" +
    "  <samp><b>symbol</samp></b> is a stock symbol referenced in a story<br />" +
    "<br />Examples:<br />" +
    "  <samp><b>cat=industrial AND symbol=IBM.</samp></b><br />" +
    "  <samp><b>magazine=(DJDN or BIZ) AND symbol=MSFT. AND body=report</samp></b><br />" +
    "  <samp><b>body=(apple AND intel)</samp></b><br />" +
    "  <samp><b>head=yahoo</samp></b><br />" +
    "  <samp><b>newssymbol=241b3044%%BIZ</samp></b><br />" +
    "  <samp><b>supplier=comtex</samp></b>" +
    "</p>";

// ---------------------------------------------------------------------------------------------------------------------------------

function dateToISOString(date: Date) {
    return date.toISOString().split("T")[0];
}

// ---------------------------------------------------------------------------------------------------------------------------------

namespace NewsSection {
    // Own props.
    interface OwnProps {}

    // Redux state we'll see as props.
    interface ReduxStateProps extends NewsState {
        client: Client | null;
        connectionInfo: ConnectionInfo;
    }

    // Redux dispatch functions we use.
    const mapDispatchToProps = {
        dispatchUpdateNews,
        dispatchAddSubscriptionInfo,
        dispatchRemoveSubscriptionInfo
    };

    // All props.
    type Props = OwnProps & ReduxStateProps & typeof mapDispatchToProps;

    class ComponentImpl extends React.PureComponent<Props> {
        render() {
            return (
                <Col>
                    <CollapsibleSection.Component title="News" initialCollapseState={true}>
                        {this.props.connectionInfo.isNewsServerServiceAvailable ? (
                            <Card body bg="light">
                                <Form onSubmit={this.processSubmit}>
                                    {/* Query string. */}
                                    <SimpleTooltip text={newsQueryTooltip}>
                                        <Form.Group as={Form.Row} className="form-group-margin">
                                            <Form.Label column className={`${labelColumnClass} text-right`}>
                                                Query:
                                            </Form.Label>
                                            <Col sm={inputColumnWidth}>
                                                <Form.Control
                                                    type="text"
                                                    size="sm"
                                                    value={this.props.query}
                                                    placeholder="Hover for tooltip with format description"
                                                    onChange={this.onQueryChange}
                                                    required
                                                />
                                            </Col>
                                        </Form.Group>
                                    </SimpleTooltip>

                                    {/* Start date. */}
                                    <Form.Group as={Form.Row} className="form-group-margin">
                                        <Form.Label column className={`${labelColumnClass} text-right`}>
                                            Start date:
                                        </Form.Label>
                                        <Col sm={inputColumnWidth}>
                                            <Form.Control
                                                type="date"
                                                size="sm"
                                                value={this.props.startDate ? dateToISOString(this.props.startDate) : ""}
                                                onChange={this.onStartDateChange}
                                            />
                                        </Col>
                                    </Form.Group>

                                    {/* End date. */}
                                    <Form.Group as={Form.Row} className="form-group-margin">
                                        <Form.Label column className={`${labelColumnClass} text-right`}>
                                            End date:
                                        </Form.Label>
                                        <Col sm={inputColumnWidth}>
                                            <Form.Control
                                                type="date"
                                                size="sm"
                                                value={this.props.endDate ? dateToISOString(this.props.endDate) : ""}
                                                onChange={this.onEndDateChange}
                                            />
                                        </Col>
                                    </Form.Group>

                                    {/* Start symbol. */}
                                    <Form.Group as={Form.Row} className="form-group-margin">
                                        <Form.Label column className={`${labelColumnClass} text-right`}>
                                            Start symbol:
                                        </Form.Label>
                                        <Col sm={inputColumnWidth}>
                                            <Form.Control
                                                type="text"
                                                size="sm"
                                                value={this.props.startSymbol ? this.props.startSymbol : ""}
                                                onChange={this.onStartSymbolChange}
                                            />
                                        </Col>
                                    </Form.Group>

                                    {/* Number of records. */}
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

                                    {/* Permission level. */}
                                    <Form.Group as={Form.Row} className="form-group-margin">
                                        <Form.Label column className={`${labelColumnClass} text-right`}>
                                            Permission level:
                                        </Form.Label>
                                        <Col sm={inputColumnWidth}>
                                            <PermissionLevelControl.Component
                                                size="sm"
                                                variant="outline-primary"
                                                permissionLevel={this.props.permissionLevel}
                                                onChange={this.onPermissionLevelChange}
                                            />
                                        </Col>
                                    </Form.Group>

                                    {/* Options. */}
                                    <Form.Group as={Form.Row} className="form-group-margin">
                                        <Form.Label column className={`${labelColumnClass} text-right`}>
                                            Options:
                                        </Form.Label>

                                        <Col sm={inputColumnWidth}>
                                            <ButtonGroup vertical toggle className="btn-block">
                                                <ToggleButton
                                                    type="checkbox"
                                                    value="disconnectExisting"
                                                    variant="outline-primary"
                                                    size="sm"
                                                    checked={this.props.updateHandler != null}
                                                    onChange={this.onSubscribeChange}
                                                >
                                                    Subscribe to query?
                                                </ToggleButton>

                                                <ToggleButton
                                                    type="checkbox"
                                                    value="disconnectOnFeedFailure"
                                                    variant="outline-primary"
                                                    size="sm"
                                                    checked={this.props.includeExpired}
                                                    onChange={this.onIncludeExpiredChange}
                                                >
                                                    Include expired stories?
                                                </ToggleButton>
                                            </ButtonGroup>
                                        </Col>
                                    </Form.Group>

                                    {/* Fields. */}
                                    <Form.Group as={Form.Row} className="form-group-margin">
                                        <Form.Label column className={`${labelColumnClass} text-right`}>
                                            Fields:
                                        </Form.Label>

                                        <Col sm={inputColumnWidth}>
                                            <FieldIdsControl.Component
                                                fieldIds={this.props.fieldIds == null ? [] : this.props.fieldIds}
                                                onChange={this.props.dispatchUpdateNews}
                                            />
                                        </Col>
                                    </Form.Group>

                                    <hr />
                                    <MakeRequest.Component />
                                </Form>
                            </Card>
                        ) : (
                            "News not available."
                        )}
                    </CollapsibleSection.Component>
                </Col>
            );
        }

        private readonly onQueryChange = (e: any /* TODO real type */) => {
            const newState = {
                query: e.target.value
            };

            this.props.dispatchUpdateNews(newState);
        };

        private readonly onStartDateChange = (e: any /* TODO proper type */) => {
            const newState = {
                startDate: e.target.valueAsDate || undefined
            };

            this.props.dispatchUpdateNews(newState);
        };

        private readonly onEndDateChange = (e: any /* TODO proper type */) => {
            const newState = {
                endDate: e.target.valueAsDate || undefined
            };

            this.props.dispatchUpdateNews(newState);
        };

        private readonly onStartSymbolChange = (e: any /* TODO proper type */) => {
            const newState = {
                startSymbol: e.target.value !== "" ? e.target.value : undefined
            };

            this.props.dispatchUpdateNews(newState);
        };

        private readonly onNumberOfRecordsChange = (e: any /* TODO proper type */) => {
            const newState = {
                numberOfRecords: e.target.valueAsNumber
            };

            this.props.dispatchUpdateNews(newState);
        };

        private readonly onPermissionLevelChange = (permissionLevel?: PermissionLevel) => {
            const newState = {
                permissionLevel
            };

            this.props.dispatchUpdateNews(newState);
        };

        private readonly onSubscribeChange = (e: any /* TODO proper type */) => {
            const newState = {
                updateHandler: e.target.checked ? this.updateHandler : undefined
            };

            this.props.dispatchUpdateNews(newState);
        };

        private readonly onIncludeExpiredChange = (e: any /* TODO proper type */) => {
            const newState = {
                includeExpired: e.target.checked
            };

            this.props.dispatchUpdateNews(newState);
        };

        private readonly processSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();

            this.makeRequest();
        };

        // TODO same code as SD pretty much. Factor out?
        private async makeRequest() {
            // TODO surely can do a runtime pick of properties based on the RequestParameters type.
            const requestParameters: News.RequestParameters = {
                query: this.props.query,
                startDate: this.props.startDate,
                endDate: this.props.endDate,
                startSymbol: this.props.startSymbol,
                numberOfRecords: this.props.numberOfRecords,
                fieldIds: this.props.fieldIds,
                includeExpired: this.props.includeExpired,
                permissionLevel: this.props.permissionLevel,
                updateHandler: this.props.updateHandler
            };
            let key: string | null = null;

            MakeRequest.initiateAsyncIterable(
                "client.news.getStories",
                JSON.stringify(requestParameters, null, 2),
                "News.Record",
                () => {
                    const requestHandle = this.props.client!.news.getStories(requestParameters);

                    if (requestHandle.isSubscription) {
                        key = uuid();

                        this.props.dispatchAddSubscriptionInfo({
                            key,
                            requestHandle,
                            name: `getStories made on ${formatDate(new Date())}`,
                            tooltip: JSON.stringify(requestParameters)
                        });
                    }

                    return requestHandle;
                },
                () => {
                    // Error in request somewhere. Cleanup unsubscription section.
                    if (key != null) {
                        this.props.dispatchRemoveSubscriptionInfo(key);
                    }
                }
            );
        }

        private readonly updateHandler = (update: News.Update) =>
            renderUpdate(this.props.client!, "News.Update", update.newsSymbol, update);
    }

    function mapStateToProps(state: AppState): ReduxStateProps {
        return {
            client: state.root.client,
            connectionInfo: state.root.connectionInfo,
            ...state.news
        };
    }

    // Generate redux connected component.
    export const Component = connect(
        mapStateToProps,
        mapDispatchToProps
    )(ComponentImpl);
} // namespace NewsSection

export default NewsSection;
