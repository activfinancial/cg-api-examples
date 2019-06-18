/*
 * SymbolDirection section.
 */

import * as React from "react";
import { connect } from "react-redux";
import Card from "react-bootstrap/Card";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form";

import MakeRequest from "../makeRequest";
import CollapsibleSection from "./collapsibleSection";
import { ConnectionInfo } from "../../connectionInfo";
import { labelColumnClass, inputColumnWidth } from "../../columnDefinitions";
import SearchByControl from "../symbolDirectory/searchBy";
import MatchType from "../symbolDirectory/matchType";
import FilterTypeControl from "../symbolDirectory/filterType";
import EntityTypesControl from "../controls/entityTypesControl";

import { AppState } from "../../store";
import { State as SymbolDirectoryState } from "../../reducers/symbolDirectoryReducer";
import { dispatchUpdateSymbolDirectory } from "../../actions/symbolDirectoryActions";

import { Client, SymbolDirectory } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

namespace SymbolDirectorySection {
    // Own props.
    interface OwnProps {}

    // Redux state we'll see as props.
    interface ReduxStateProps extends SymbolDirectoryState {
        client: Client | null;
        connectionInfo: ConnectionInfo;
    }

    // Redux dispatch functions we use.
    const mapDispatchToProps = {
        dispatchUpdateSymbolDirectory
    };

    // All props.
    type Props = OwnProps & ReduxStateProps & typeof mapDispatchToProps;

    class ComponentImpl extends React.PureComponent<Props> {
        render() {
            return (
                <Col>
                    <CollapsibleSection.Component title="Symbol Directory" initialCollapseState={true}>
                        {this.props.connectionInfo.isSymbolDirectoryServiceAvailable ? (
                            <Card body bg="light">
                                <Form onSubmit={this.processSubmit}>
                                    <Form.Group as={Form.Row} className="form-group-margin">
                                        <Form.Label column className={`${labelColumnClass} text-right`}>
                                            Search term:
                                        </Form.Label>
                                        <Col sm={inputColumnWidth}>
                                            <Form.Control
                                                type="text"
                                                size="sm"
                                                value={this.props.search}
                                                onChange={this.onSearchTermChange}
                                                required
                                            />
                                        </Col>
                                    </Form.Group>

                                    <Form.Group as={Form.Row} className="form-group-margin">
                                        <Form.Label column className={`${labelColumnClass} text-right`}>
                                            Search by:
                                        </Form.Label>
                                        <Col sm={inputColumnWidth}>
                                            <SearchByControl.Component
                                                size="sm"
                                                variant="outline-primary"
                                                fieldId={this.props.fieldId}
                                                onChange={this.props.dispatchUpdateSymbolDirectory}
                                            />
                                        </Col>
                                    </Form.Group>

                                    <Form.Group as={Form.Row} className="form-group-margin">
                                        <Form.Label column className={`${labelColumnClass} text-right`}>
                                            Match type:
                                        </Form.Label>
                                        <Col sm={inputColumnWidth}>
                                            <MatchType.Component
                                                size="sm"
                                                variant="outline-primary"
                                                matchType={this.props.matchType!}
                                                onChange={this.props.dispatchUpdateSymbolDirectory}
                                            />
                                        </Col>
                                    </Form.Group>

                                    <Form.Group as={Form.Row} className="form-group-margin">
                                        <Form.Label column className={`${labelColumnClass} text-right`}>
                                            Filter type:
                                        </Form.Label>
                                        <Col sm={inputColumnWidth}>
                                            <FilterTypeControl.Component
                                                size="sm"
                                                variant="outline-primary"
                                                filterType={this.props.filterType!}
                                                onChange={this.props.dispatchUpdateSymbolDirectory}
                                            />
                                        </Col>
                                    </Form.Group>

                                    {this.isEntityTypesVisible() && (
                                        <Form.Group as={Form.Row} className="form-group-margin">
                                            <Form.Label column className={`${labelColumnClass} text-right`}>
                                                Entity type(s):
                                            </Form.Label>
                                            <Col sm={inputColumnWidth}>
                                                <EntityTypesControl.Component
                                                    entityTypes={this.props.entityTypes!}
                                                    required
                                                    onChange={this.props.dispatchUpdateSymbolDirectory}
                                                />
                                            </Col>
                                        </Form.Group>
                                    )}

                                    <hr />
                                    <MakeRequest.Component />
                                </Form>
                            </Card>
                        ) : (
                            "SymbolDirectory not available."
                        )}
                    </CollapsibleSection.Component>
                </Col>
            );
        }

        private readonly onSearchTermChange = (e: any /* TODO real type */) => {
            const newState = {
                search: e.target.value
            };

            this.props.dispatchUpdateSymbolDirectory(newState);
        };

        private isEntityTypesVisible() {
            return (
                this.props.filterType === SymbolDirectory.FilterType.includeEntityTypes ||
                this.props.filterType === SymbolDirectory.FilterType.excludeEntityTypes
            );
        }

        private readonly processSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
            e.preventDefault();
            // TODO surely can do a runtime pick of properties based on the RequestParameters type.
            const requestParameters: SymbolDirectory.RequestParameters = {
                fieldId: this.props.fieldId,
                search: this.props.search,
                filterType: this.props.filterType,
                matchType: this.props.matchType,
                entityTypes: this.props.entityTypes
            };

            MakeRequest.initiateAsyncIterable(
                "client.symbolDirectory.getSymbols",
                JSON.stringify(requestParameters, null, 2),
                "SymbolDirectory.SymbolResponse",
                () => this.props.client!.symbolDirectory.getSymbols(requestParameters)
            );
        };
    }

    function mapStateToProps(state: AppState): ReduxStateProps {
        return {
            client: state.root.client,
            connectionInfo: state.root.connectionInfo,
            ...state.symbolDirectory
        };
    }

    // Generate redux connected component.
    export const Component = connect(
        mapStateToProps,
        mapDispatchToProps
    )(ComponentImpl);
} // namespace SymbolDirectorySection

export default SymbolDirectorySection;
