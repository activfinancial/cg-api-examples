/*
 * Symbol list control. Handles delimiting and generates an array of strings.
 */

import * as React from "react";
import Textarea from "react-textarea-autosize";

// ---------------------------------------------------------------------------------------------------------------------------------

// State to be lifted up and managed elsewhere.
export interface LiftedState {
    symbolList: string[];
}

// Own props.
interface OwnProps {
    onChange: (newState: Partial<LiftedState>, shouldSubmit?: boolean) => void;
}

// All props.
type Props = OwnProps & LiftedState;

// Internal state.
interface State {
    str: string;
    symbolList: string[];
}

export class Component extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);

        this.state = Component.getStateFromProps(this.props);
    }

    render() {
        return (
            <Textarea
                className="form-control form-control-sm textarea-autosize"
                wrap="off"
                placeholder="Symbol per line (ctrl-enter to send)"
                required
                maxRows={10}
                value={this.state.str}
                onChange={this.onChange}
                onBlur={this.onBlur}
                onKeyPress={this.onKeyPress}
            />
        );
    }

    // React lifecycle method to update internal state from props change.
    static getDerivedStateFromProps(props: Props, state: State) {
        if (props.symbolList !== state.symbolList) {
            return Component.getStateFromProps(props);
        }

        return null;
    }

    private static getStateFromProps(props: Props) {
        return {
            str: Component.symbolListToString(props.symbolList),
            symbolList: props.symbolList
        };
    }

    private readonly onChange = (e: any /* TODO seems to be buggy TS defs */) => {
        const str = e.target.value;
        this.setState({ str });
    };

    private readonly onBlur = () => this.processInput();

    private readonly onKeyPress = (e: React.KeyboardEvent<HTMLElement>) => {
        // Ctrl-enter to make request.
        if (e.key === "Enter" && e.ctrlKey) {
            // TODO this is ugly. How to manually trigger a form submit, that invokes the onSubmit function??
            // It needs to be async such that the setState() in the parent has propagated.
            // What I've done here is allow passing a flag to say the setState() in the parent
            // should invoke a callback (and that callback is the makeRequest() function). Goodness.
            this.processInput(true);
        }
    };

    private processInput(shouldSubmit?: boolean) {
        // Input blurred or ctrl-enter hit, so normalize input: remove whitespace and empty symbols.
        const symbolList = this.state.str
            .split(Component.delimiter)
            .map((symbol) => symbol.trim())
            .filter((symbol) => symbol.length > 0);

        // Pass new symbolList to parent. No need to update our symbolList state; getDerivedStateFromProps() will handle it.
        this.props.onChange({ symbolList }, shouldSubmit);
    }

    private static symbolListToString(symbolList: string[]) {
        // NB we'll only do validation on user input; we should display whatever the prop we were passed is.
        return symbolList.join(Component.delimiter);
    }

    static readonly delimiter = "\n";
}
