import { Component } from 'inferno';
export interface IPromptProps {
    when: any;
    message: string;
}
/**
 * The public API for matching a single path and rendering.
 */
export declare class Prompt extends Component<IPromptProps, any> {
    unblock: any;
    enable(message: any): void;
    disable(): void;
    componentWillMount(): void;
    componentWillReceiveProps(nextProps: any): void;
    componentWillUnmount(): void;
    render(): null;
}
