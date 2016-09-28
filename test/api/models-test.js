import api from '../../src/api/index';
import expect from 'expect';
import { removeSync, outputFileSync } from 'fs-extra';
import { join, dirname } from 'path';

describe('api/models', () => {

  const filePath = './tmp/a.js';
  const absFilePath = join(__dirname, filePath);

  afterEach(() => {
     removeSync(dirname(absFilePath));
  });

  it('models.create', () => {
    const result = api('models.create', {
      filePath: filePath,
      sourcePath: __dirname,
      namespace: 'a',
    });
    expect(result).toEqual(
      {"models":{"data":[{"reducers":[],"effects":[],"subscriptions":[],"namespace":"a","state":{},"id":"Model^^./tmp/a.js^^a","filePath":"./tmp/a.js"}],"reducerByIds":{},"effectByIds":{},"subscriptionByIds":{}},"router":null,"routeComponents":[],"dispatches":{}}
    );
  });

  it('models.updateNamespace', () => {
    const source = `
      export default {
        namespace: 'count',
        state: 0,
      };
    `;
    outputFileSync(absFilePath, source, 'utf-8');
    const result = api('models.updateNamespace', {
      filePath,
      sourcePath: __dirname,
      namespace: 'count',
      newNamespace: 'newCount',
    });
    expect(result).toEqual(
      {"models":{"data":[{"reducers":[],"effects":[],"subscriptions":[],"namespace":"newCount","state":0,"id":"Model^^./tmp/a.js^^newCount","filePath":"./tmp/a.js"}],"reducerByIds":{},"effectByIds":{},"subscriptionByIds":{}},"router":null,"routeComponents":[],"dispatches":{}}
    );
  });

  it('models.updateState', () => {
    const source = `
      export default {
        namespace: 'count',
        state: 0,
      };
    `;
    outputFileSync(absFilePath, source, 'utf-8');
    const result = api('models.updateState', {
      filePath,
      sourcePath: __dirname,
      namespace: 'count',
      source: '{ a: 1 }',
    });
    expect(result).toEqual(
      {"models":{"data":[{"reducers":[],"effects":[],"subscriptions":[],"namespace":"count","state":{"a":1},"id":"Model^^./tmp/a.js^^count","filePath":"./tmp/a.js"}],"reducerByIds":{},"effectByIds":{},"subscriptionByIds":{}},"router":null,"routeComponents":[],"dispatches":{}}
    );
  });

  it('models.addReducer', () => {
    const source = `
      export default {
        namespace: 'count',
        state: 0,
        reducers: {},
      };
    `;
    outputFileSync(absFilePath, source, 'utf-8');
    const result = api('models.addReducer', {
      filePath,
      sourcePath: __dirname,
      namespace: 'count',
      name: 'add',
      source: '1',
    });
    expect(result).toEqual(
      {"models":{"data":[{"reducers":["Reducer^^./tmp/a.js^^add"],"effects":[],"subscriptions":[],"namespace":"count","state":0,"id":"Model^^./tmp/a.js^^count","filePath":"./tmp/a.js"}],"reducerByIds":{"Reducer^^./tmp/a.js^^add":{"name":"add","source":"1","id":"Reducer^^./tmp/a.js^^add","filePath":"./tmp/a.js"}},"effectByIds":{},"subscriptionByIds":{}},"router":null,"routeComponents":[],"dispatches":{"count/add":{"input":[],"output":["Reducer^^./tmp/a.js^^add"]}}}
    );
  });
});
