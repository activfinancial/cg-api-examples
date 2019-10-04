/*
 *
 */

import * as React from "react";
import { Component } from "react";
import Card from "react-bootstrap/Card";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import ToggleButton from "react-bootstrap/ToggleButton";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Col from "react-bootstrap/Col";
import InputGroup from "react-bootstrap/InputGroup";

import RelationshipIdControl from "../controls/relationshipIdControl";
import { Component as FieldIdsControl } from "../controls/fieldIdsControl";
import SimpleTooltip from "../simpleTooltip";

import { Streaming, FieldId, RelationshipId } from "@activfinancial/cg-api";

// ---------------------------------------------------------------------------------------------------------------------------------

export interface RelationshipInfo extends Streaming.IRelationship {
    id?: RelationshipId;
    key: string;
}

interface Props {
    className?: string;
    relationshipInfo: RelationshipInfo;
    subscriptionType?: Streaming.SubscriptionType;
    onChange: (relationshipInfo: Partial<RelationshipInfo>) => void;
    onRemove?: () => void;
}

class Relationship extends Component<Props> {
    constructor(props: Props) {
        super(props);

        this.state = {
            fieldIds: Relationship.fieldIdsToString(this.props.relationshipInfo.fieldIds)
        };
    }

    render() {
        return (
            <Card body bg="light" className={this.props.className}>
                <Form.Group as={Form.Row} className="form-group-margin">
                    <Col md={5}>
                        <RelationshipIdControl
                            relationshipId={this.props.relationshipInfo.id}
                            onChange={this.onRelationshipIdChange}
                        />
                    </Col>

                    <Col md={5}>
                        <Form.Control
                            type="text"
                            size="sm"
                            placeholder="Navigation filter pattern"
                            value={this.props.relationshipInfo.navigationFilterPattern}
                            disabled={!this.props.relationshipInfo.id}
                            // No special processing for nav filter pattern, so just pass all changes to parent.
                            onChange={this.onNavigationFilterPatternChange}
                        />
                    </Col>

                    <Col md={2}>
                        <SimpleTooltip text="Remove relationship">
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

                {this.props.relationshipInfo.fieldIds != null && (
                    <Form.Group as={Form.Row} className="form-group-margin">
                        <Col sm={12}>
                            <InputGroup>
                                <FieldIdsControl
                                    fieldIds={
                                        this.props.relationshipInfo.fieldIds == null ? [] : this.props.relationshipInfo.fieldIds
                                    }
                                    disabled={this.props.relationshipInfo.fieldIds == null}
                                    onChange={this.props.onChange}
                                />
                            </InputGroup>
                        </Col>
                    </Form.Group>
                )}

                <Form.Group as={Form.Row} className="form-group-margin">
                    <Col sm={12}>
                        <ButtonGroup toggle vertical className="btn-block">
                            <ToggleButton
                                type="checkbox"
                                size="sm"
                                variant="outline-primary"
                                value={true}
                                checked={this.props.relationshipInfo.fieldIds == null}
                                onChange={this.onAllFieldsChange}
                            >
                                Get all fields in record
                            </ToggleButton>
                        </ButtonGroup>
                    </Col>
                </Form.Group>

                {this.props.subscriptionType && (
                    <Form.Group as={Form.Row} className="form-group-margin">
                        <Col sm={12}>
                            <ButtonGroup toggle vertical className="btn-block">
                                <ToggleButton
                                    type="checkbox"
                                    size="sm"
                                    variant="outline-primary"
                                    value={true}
                                    checked={this.props.relationshipInfo.subscribe}
                                    onChange={this.onSubscribeChange}
                                >
                                    Subscribe to results of this relationship
                                </ToggleButton>
                            </ButtonGroup>
                        </Col>
                    </Form.Group>
                )}
            </Card>
        );
    }

    private readonly onRelationshipIdChange = (relationshipId?: RelationshipId) => {
        this.props.onChange({ id: relationshipId });
    };

    private readonly onNavigationFilterPatternChange = (e: any /* TODO React.ChangeEvent<HTMLInputElement> */) => {
        const navigationFilterPattern = e.target.value;
        this.props.onChange({ navigationFilterPattern });
    };

    private readonly onAllFieldsChange = (e: any /* TODO React.ChangeEvent<HTMLInputElement> */) => {
        const fieldIds: undefined | FieldId[] = e.target.checked ? undefined : [];
        this.props.onChange({ fieldIds });
    };

    private readonly onSubscribeChange = (e: any /* TODO React.ChangeEvent<HTMLInputElement> */) => {
        const subscribe = e.target.checked;
        this.props.onChange({ subscribe });
    };

    private static fieldIdsToString(fieldIds?: FieldId[]) {
        if (fieldIds == null) {
            return "";
        }

        return fieldIds.join(";");
    }
}

export default Relationship;
