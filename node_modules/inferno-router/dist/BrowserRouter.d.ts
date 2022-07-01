import { Component, VNode } from 'inferno';
export interface IBrowserRouterProps {
    basename?: string;
    forceRefresh?: boolean;
    getUserConfirmation?: () => {};
    keyLength?: number;
    children: Component<any, any>[] | JSX.Element;
}
export declare class BrowserRouter extends Component<IBrowserRouterProps, any> {
    history: any;
    constructor(props?: any, context?: any);
    render(): VNode;
}
