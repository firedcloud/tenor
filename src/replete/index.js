import {
    Component
} from 'inferno'; // eslint-disable-line no-unused-vars

export class DataSource {
    constructor(store, path) {
        this.store = store;
        this.path = path;
    }
    key(keyArgs) {
        throw new Error(`'key' method has not been defined.`);
    }
    getInitial(keyArgs) {
        // Return an initial value, maybe kick off an async function to fetch
        // actual data from a server.
        throw new Error(`'getInitial' method has not been defined.`);
    }
    get(...args) {
        return this.store.get(this.path, ...args);
    }
    set(...args) {
        return this.store.set(this.path, ...args);
    }
}


export class Store {
    constructor(createElement) {
        /*
         * @params lib {object} - React, Inferno, os similar library.
         * @returns {Store}
         */
        this.createElement = createElement;
        this.data = {};
        this.metaTree = this.newMetaNode();
        this.pendingPromises = [];
    }
    newMetaNode() {
        return {
            children: {},
            listeners: [],
            dataSource: null,
        };
    }
    monitor(promise) {
        this.pendingPromises.push(promise);
        // We need to prevent this list from growing forever, it only needs
        // pending promises.
        const remove = () => {
            this.pendingPromises.splice(this.pendingPromises.indexOf(promise, 1));
        };
        promise.then(remove, remove);
        return promise;
    }
    register(path, DataSource) {
        let metaSegments = path.split('.');

        // Populate trees
        let segment = this.data;

        const lastKey = metaSegments[metaSegments.length - 1];
        metaSegments = metaSegments.slice(0, -1);

        for (const segmentName of metaSegments) {
            segment[segmentName] = segment[segmentName] || {};
            segment = segment[segmentName];
        }

        if (lastKey !== '*') {
            metaSegments.push(lastKey);
        }

        let metaNode = this.metaTree;
        for (const segmentName of metaSegments) {
            metaNode.children[segmentName] = metaNode.children[segmentName] || this.newMetaNode();
            metaNode = metaNode.children[segmentName];
        }
        if (metaNode.dataSource) {
            throw new Error(`A Data Source with this path has already been added: ${path}`);
        }
        metaNode.dataSource = new DataSource(this, path);
    }
    resolvePath(path, keyArgs) {
        if (typeof path !== 'string') {
            // this function was passed an already resolved path.
            return path;
        }

        keyArgs = keyArgs || [];

        const allSegments = path.split('.');
        let lastKey;

        let metaParent = null;
        let metaNode = this.metaTree;
        let dataSource = null;
        let dataSegments = [];
        // TODO: support listening on attributes
        const attributeSegments = [];

        let hasWildcard = false;

        let keySegmentFound = false;

        for (const segmentName of allSegments) {
            if (dataSource) {
                if (!keySegmentFound) {
                    keySegmentFound = true;
                    if (segmentName !== '*') {
                        // if it's a wildcard, leave keyArgs alone. Otherwise,
                        // set keyArgs.
                        if (keyArgs.length) {
                            throw new Error(`'keyArgs' was specified (${keyArgs.length}L), but there was no wildcard after the data source path: '${path}', '${keyArgs}'.`);
                        }
                        lastKey = segmentName;
                        keyArgs = [segmentName];
                    } else {
                        hasWildcard = true;
                    }
                } else {
                    attributeSegments.push(segmentName);
                }
            } else {
                if (!metaNode.children[segmentName]) {
                    break;
                }

                dataSegments.push(segmentName);

                metaParent = metaNode;
                metaNode = metaNode.children[segmentName];

                if (metaNode.dataSource) {
                    dataSource = metaNode.dataSource;
                }
            }
        }

        if (!dataSource) {
            // Not necessarily a problem, this could happen when pre-loading
            // data at the top of the tree on app initialization.
            console.warn(`No data source found for '${path}'.`);
            if (hasWildcard) {
                throw new Error(`Wildcard was specified, but no data source was found: '${path}'`);
            }
        }

        if (keyArgs.length === 0) {
            lastKey = dataSegments[dataSegments.length - 1];
            dataSegments = dataSegments.slice(0, dataSegments.length - 1);
        } else if (hasWildcard && keyArgs.length) {
            lastKey = dataSource.key(keyArgs);
        }

        if (dataSource) {
            if (!metaNode.children[lastKey]) {
                metaNode.children[lastKey] = this.newMetaNode();
            }
            metaParent = metaNode;
            metaNode = metaNode.children[lastKey];
        }

        let dataParent = this.data;

        for (const segmentName of dataSegments) {
            if (!dataParent.hasOwnProperty(segmentName)) {
                throw new Error(`Could not resolve data path '${path}'.`);
            }
            dataParent = dataParent[segmentName];
        }

        return {
            dataParent,
            metaParent,
            metaNode,
            dataSegments,
            hasWildcard,
            lastKey,
            attributeSegments,
            dataSource,
            path,
            keyArgs,
        };
    }
    call(path, ...otherArgs) {
        let keyArgs = [];
        let methodName;
        let methodArgs = [];

        if (otherArgs.length === 1) {
            [methodName] = otherArgs;
        } else if (otherArgs.length === 2) {
            [keyArgs, methodName] = otherArgs;
        } else {
            [keyArgs, methodName, methodArgs] = otherArgs;
        }

        const resolvedPath = this.resolvePath(path, keyArgs);
        const {
            dataSource
        } = resolvedPath;
        keyArgs = resolvedPath.keyArgs;

        if (!dataSource) {
            throw new Error(`No data source was found. ${path}, ${keyArgs}`);
        }

        return dataSource[methodName](keyArgs, methodArgs);
    }
    log() {
        console.log('GLOBAL STATE: ', this.data);
    }
    get(path, keyArgs) {
        const resolvedPath = this.resolvePath(path, keyArgs);
        const {
            dataParent,
            lastKey,
            dataSource,
            attributeSegments
        } = resolvedPath;
        keyArgs = resolvedPath.keyArgs;

        if (dataParent && dataParent.hasOwnProperty(lastKey)) {
            return dataParent[lastKey];
        }

        if (!dataSource) {
            throw new Error(`No data source was found. ${path}, ${keyArgs}`);
        }

        // return unsaved initial data
        let val = dataSource.getInitial(keyArgs);

        for (const attr of attributeSegments) {
            val = val[attr];
        }
        return val;
    }
    set(path, ...args) {
        // console.log(`STORE set() path: ${path}, args: ${args}`);
        // TODO: support TTL, TTL after unlisten
        if (args.length === 1) {
            args.unshift([]);
        }
        const [keyArgs, val] = args;
        const resolvedPath = this.resolvePath(path, keyArgs);

        let {
            dataParent,
            lastKey,
            attributeSegments
        } = resolvedPath;

        if (process.env.NODE_ENV !== 'production') {
            try {
                // TODO: add deep checking
                if (val !== JSON.parse(JSON.stringify(val))) {
                    // console.warn(`deserialized val does not equal val.`, resolvedPath, val);
                }
            } catch (e) {
                // console.warn(`val was not JSON serializable.`, resolvedPath, val);
            }
        }

        const allSegments = [lastKey].concat(attributeSegments);
        lastKey = allSegments.pop();
        for (const attr of allSegments) {
            dataParent = dataParent[attr];
        }
        dataParent[lastKey] = val;

        // TODO: check if there's any child listeners and make sure they are invalidated if needed
        this.callListeners(resolvedPath, this.get(path, keyArgs));
    }
    remove(path, keyArgs) {
        const resolvedPath = this.resolvePath(path, keyArgs);
        const {
            dataParent,
            metaParent,
            lastKey
        } = resolvedPath;
        keyArgs = resolvedPath.keyArgs;
        delete dataParent[lastKey];

        this.callListeners(resolvedPath, this.get(path, keyArgs));

        delete metaParent.children[lastKey];
    }
    callListeners(resolvedPath, val) {
        const {
            metaNode
        } = resolvedPath;

        // We need to use a copy of the metaNode.listeners array, because a
        // listener can trigger a chain of events that results in
        // metaNode.listeners being updated in place (when a callback is
        // unlistened), which can cause subsequent listeners to be skipped and
        // new listeners to be triggered instead.
        metaNode && metaNode.listeners.slice().forEach((listener) => {
            // console.log(`STORE callListeners() listner: ${listener}, resolvedPath: ${resolvedPath}, val: ${val}`);
            listener(resolvedPath, val);
        });
    }
    onChange(path, keyArgs, callback) {
        const resolvedPath = this.resolvePath(path, keyArgs);
        const {
            metaNode
        } = resolvedPath;

        const listenersArray = metaNode.listeners;
        listenersArray.push(callback);

        return () => {
            const idx = listenersArray.indexOf(callback);
            if (idx > -1) {
                listenersArray.splice(idx, 1);
            }
        };
    }
}


export const transformProps = (f) => {
    // used for calculating/cleaning props from router params
    return function(Target) {
        function wrap(props, context) {
            return f(Object.assign({}, props), context);
        }
        return function TransformPropsWrapper(props, context) {
            props = wrap(props, context);
            return context.store.createElement(Target, props);
        };
    };
};


function getKeyArgsFromPropNames(propNames, props, state) {
    if (propNames.length && typeof propNames[0] === 'function') {
        return propNames[0](props, state);
    }
    return propNames.map((propName) => {
        return props[propName];
    });
}

// TODO: https://reactjs.org/docs/higher-order-components.html#convention-wrap-the-display-name-for-easy-debugging
/**
 * Connects to multiple data stores.
 * e.g. @connect([propName, path, ...argNames])
 *
 * @typedef
 * Mappings
 * @type {object[]}
 * Contains: propName, path, ...propNames
 * propName {string} - the propName used to store the result.
 * path {string} - the path of the data store.
 * ...propNames {string[]} - list of prop names that will be used to call the data store.
 *
 * @param ...mappings {Mappings[]}
 * @returns function
 */
export const subscribe = (mappings) => {
    // In case we want to allow a transformProps function as the first arg.
    // let f = null;
    // if (args.length > 1) {
    //     f = args.shift();
    // }
    // const mappings = args[0];
    return function(Target) {
        return class extends Component {
            constructor(props, context) {
                super(props, context);
                this.mounted = false;
                this.state = {};
                this.init(props);
            }
            componentWillUnmount() {
                this.mounted = false;
                this.unlistenAll();
            }
            componentWillUpdate(nextProps, nextState) {
                this.init(nextProps);
                this.addListeners(nextProps, mappings);
                this.addListeners(this.props, this.pendingMappings);
                this.pendingMappings = {};
            }
            componentDidMount() {
                this.mounted = true;
                this.addListeners(this.props, mappings);
                this.addListeners(this.props, this.pendingMappings);
                this.pendingMappings = {};
            }
            init(props) {
                this.pendingMappings = {};

                this.unlistenAll();

                this.propsToState(props, mappings);
            }
            addListeners(props, map) {
                const store = this.context.store;

                return Object.entries(map).map(([propName, [path, ...propNames]]) => {
                    // get path, pass in props in propMap
                    const keyArgs = this.keyArgsMap[propName];

                    // on update, call setState
                    const unlistener = store.onChange(path, keyArgs, (resolvedPath, val) => {
                        if (this.mounted) {
                            this.setState({
                                [propName]: val
                            });
                        } else {
                            this.state[propName] = val;
                        }
                    });
                    this.unlistenArray.push(unlistener);
                    return unlistener;
                });
            }
            unlistenAll() {
                if (this.unlistenArray) {
                    this.unlistenArray.forEach((unlisten) => {
                        unlisten();
                    });
                }
                this.unlistenArray = [];
            }
            propsToState(props, map) {
                const store = this.context.store;

                this.keyArgsMap = this.keyArgsMap || {};

                // TODO: support promises for getKeyArgsFromPropNames functions?
                return Object.entries(map).map(([propName, [path, ...propNames]]) => {
                    // get path, pass in props in propMap
                    const keyArgs = getKeyArgsFromPropNames(propNames, props, this.state);
                    this.keyArgsMap[propName] = keyArgs;

                    this.state[propName] = store.get(path, keyArgs);

                    return this.state[propName];
                });
            }
            subscribe(map) {
                const vals = this.propsToState(this.props, map);

                this.pendingMappings = Object.assign(this.pendingMappings, map);

                return vals;
            }
            render() {
                const props = Object.assign({}, this.props);

                for (const [key, val] of Object.entries(this.state)) {
                    props[key] = val;
                }

                props.subscribe = this.subscribe.bind(this);

                return this.context.store.createElement(Target, props);
            }
        };
    };
};