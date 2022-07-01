/**
 * Public API for matching a URL pathname to a path pattern.
 */
export declare function matchPath(pathname: any, options: any): {
    isExact: boolean;
    params: any;
    path: any;
    url: any;
} | null;
