const fs = require('fs');
const path = require('path');
const { parseListableResult } = require('./listable');

const listableFixturesDir = path.resolve(__dirname, '../__fixtures__/listable');

const readMockOutput = (fileName) => fs.readFileSync(`${listableFixturesDir}/${fileName}`).toString();

const mockPackages = [
  {
    name: 'lerna-circleci-test-package-1',
    version: '0.0.1',
    private: false,
    location: '/lerna-circleci/src/__fixtures__/test-monorepo/packages/test-package-1',
  },
  {
    name: 'lerna-circleci-test-package-2',
    version: '0.0.1',
    private: false,
    location: '/lerna-circleci/src/__fixtures__/test-monorepo/packages/test-package-2',
  },
  {
    name: 'lerna-circleci-test-package-3',
    version: '0.0.1',
    private: false,
    location: '/lerna-circleci/src/__fixtures__/test-monorepo/packages/test-package-3',
  },
  {
    name: 'lerna-circleci-test-package-4',
    version: '0.0.1',
    private: true,
    location: '/lerna-circleci/src/__fixtures__/test-monorepo/packages/test-package-4',
  },
  {
    name: 'lerna-circleci-test-package-5',
    version: '0.0.1',
    private: true,
    location: '/lerna-circleci/src/__fixtures__/test-monorepo/packages/test-package-5',
  },
];

const mockPackageGraph = {
  rawPackageList: mockPackages,
  pkgMap: Object.fromEntries(mockPackages.map((pkg) => [pkg.name, pkg])),
  get(pkgName) {
    return { pkg: this.pkgMap[pkgName] };
  },
};

describe('parseListableResult', () => {
  function setup({ text, options }) {
    return parseListableResult({
      result: { text },
      options: { _: [], all: true, ...options },
      packageGraph: mockPackageGraph,
    });
  }

  it.each([
    ['listAll.txt', {}],
    ['listAllLong.txt', { long: true }],
    ['listAllGraph.txt', { graph: true }],
    ['listAllJson.txt', { json: true }],
    ['listAllNdjson.txt', { ndjson: true }],
    ['listAllParseable.txt', { parseable: true }],
    ['listAllParseableLong.txt', { parseable: true, long: true }],
  ])('parses fixture %s correctly with options: %p', (fixtureFilename, options) => {
    const result = setup({ text: readMockOutput(fixtureFilename), options });
    expect(result).toEqual(mockPackageGraph.rawPackageList);
  });

  it.each([
    [{}, '\n'],
    [{ long: true }, '\n'],
    [{ graph: true }, '{}'],
    [{ json: true }, '[]'],
    [{ ndjson: true }, '\n'],
    [{ parseable: true }, '\n'],
    [{ parseable: true, long: true }, '\n'],
  ])('parses empty list outputs correctly with options: %p', (options, text) => {
    const result = setup({ text, options });
    expect(result).toEqual([]);
  });

  it('returns an empty list if no text is passed', () => {
    const result = setup({ text: '  ' });
    expect(result).toEqual([]);
  });
});
