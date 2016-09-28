import j from 'jscodeshift';
import once from 'lodash.once';
import assert from 'assert';
import Helper from './Helper';
import * as utils from '../utils/index';

Helper.register();

const methods = {

  findModels(namespace) {
    return this.find(j.ObjectExpression, node => {
      const props = node.properties.reduce((memo, prop) => {
        if (j.Property.check(prop)) {
          if (prop.key.name === 'namespace') {
            assert(
              j.Literal.check(prop.value),
              `findModels: namespace should be Literal, but got ${prop.value.type}`
            );
            memo[prop.key.name] = prop.value.value;
          } else {
            memo[prop.key.name] = true;
          }
        }
        return memo;
      }, {});

      if (!props.namespace) return false;
      if (namespace && props.namespace !== namespace) return false;
      // state 不是必须的
      // 但为增加准确性, 还需要声明除 namespace 以外的其他任一项
      return props.state ||
        props.reducers ||
        props.effects ||
        props.subscriptions;
    });
  },

  updateNamespace(newNamespace) {
    return this.forEach(path => {
      path.node.properties.forEach(prop => {
        if (j.Property.check(prop) && prop.key.name === 'namespace') {
          prop.value = j.literal(newNamespace);
        }
      });
    });
  },

  updateState(source) {
    return this.forEach(path => {
      path.node.properties.forEach(prop => {
        if (j.Property.check(prop) && prop.key.name === 'state') {
          prop.value = utils.getExpression(source);
        }
      });
    });
  },

  addReducer(name, source) {
    return this.forEach(path => {
      let reducers = null;
      path.node.properties.forEach(prop => {
        if (j.Property.check(prop) && prop.key.name === 'reducers') {
          assert(
            j.ObjectExpression.check(prop.value),
            `addReducer: reducers should be ObjectExpression, but got ${prop.value.type}`
          );
          reducers = prop;
        }
      });

      const defaultSource = `function(state) {\n  return state;\n}`;
      let fn = utils.getExpression(source || defaultSource);

      const reducer = j.property(
        'init',
        j.identifier(name),
        fn
      );

      if (!reducers) {
        reducers = j.property(
          'init',
          j.identifier('reducers'),
          j.objectExpression([])
        );
        path.node.properties.push(reducers);
      }

      reducers.value.properties.push(reducer);
    });
  },

  getModelInfo() {
    const defaultModel = {
      reducers: [],
      effects: [],
      subscriptions: [],
    };
    return this.simpleMap(path => {
      const node = path.node;
      const result = node.properties.reduce((memo, prop) => {
        const name = prop.key.name;
        switch (name) {
          case 'namespace':
            memo[name] = prop.value.value;
            return memo;
          case 'state':
            memo[name] = utils.recursiveParse(prop.value);
            return memo;
          case 'reducers':
            memo[name] = parseReducers(prop.value);
            return memo;
          case 'effects':
            memo[name] = parseEffects(prop.value);
            return memo;
          case 'subscriptions':
            memo[name] = parseSubscriptions(prop.value);
            return memo;
          default:
            throw new Error(`getModelProperties: unrecognized property of dva model: ${name}`);
        }
      }, defaultModel);

      // TODO: reducers 等的解析支持 VariableDeclaraction
      // TODO: reducers 等的解析支持通过 import 从外部引入
      // TODO: add id for reducers, effects and subscriptions
      return result;
    });

    function parseBasic(node, parseType, extra) {
      assert(
        node.type === 'ObjectExpression',
        `getModelProperties: ${parseType} should be ObjectExpression, but got ${node.type}`
      );
      return node.properties.map(prop => {
        const name = utils.getPropertyValue(prop.key);
        const result = {
          name,
          source: j(prop.value).toSource(),
        };
        if (extra) {
          extra(result, prop.value);
        }
        return result;
      });
    }

    function parseReducers(node) {
      return parseBasic(node, 'reducers');
    }

    function parseEffects(node) {
      return parseBasic(node, 'effects', (result, node) => {
        result.dispatches = j(node).findDispatchCalls().getActionTypeFromCall();
      });
    }

    function parseSubscriptions(node) {
      return parseBasic(node, 'subscriptions', (result, node) => {
        result.dispatches = j(node).findDispatchCalls().getActionTypeFromCall();
      });
    }
  },
};

function register(jscodeshift = j) {
  jscodeshift.registerMethods(methods);
}

export default {
  register: once(register),
};

