# hoist-non-inferno-statics

Copies non-Inferno specific statics from a child component to a parent component. 
Similar to `Object.assign`, but with Inferno static keywords blacklisted from
being overridden.

```bash
$ npm install --save hoist-non-inferno-statics
```

## Usage

```js
import hoistNonInfernoStatic from 'hoist-non-inferno-statics';

hoistNonInfernoStatic(targetComponent, sourceComponent);
```