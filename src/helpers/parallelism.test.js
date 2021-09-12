const { splitEvenly, splitByTimings } = require('./parallelism');
const mockTimings = require('../__fixtures__/test-monorepo/mockTimings.json');

const packageTags = [...mockTimings.tests.map(({ name }) => name), 'untimed-task'];

const [p1, p2, p3, p4, p5] = packageTags;

const expectedEvenSplits = [
  [1, 0, packageTags],
  [2, 0, [p1, p2, p3]],
  [2, 1, [p4, p5]],
  [5, 0, [p1]],
  [5, 4, [p5]],
  [3, 1, [p3, p4]],
  [3, 2, [p5]],
];

const expectedTimingSplits = [
  [1, 0, packageTags],
  [2, 0, [p1, p2]],
  [2, 1, [p3, p4, p5]],
  [5, 0, [p1]],
  [3, 1, [p3]],
  [3, 2, [p4, p2, p5]],
];

describe('splitEvenly', () => {
  it.each(expectedEvenSplits)(
    'gets expected even split with: { "nodeTotal": %i, "nodeIndex": %i }',
    (nodeTotal, nodeIndex, expectedSplit) => {
      const result = splitEvenly(packageTags, { nodeTotal, nodeIndex });
      expect(result).toEqual(expectedSplit);
    }
  );
});

describe('splitByTimings', () => {
  it.each(expectedTimingSplits)(
    'gets expected timing split with: { "nodeTotal": %i, "nodeIndex": %i }',
    (nodeTotal, nodeIndex, expectedSplit) => {
      const { result } = splitByTimings(packageTags, mockTimings.tests, { nodeTotal, nodeIndex });
      expect(result).toHaveLength(expectedSplit.length);
      expect(result).toEqual(expect.arrayContaining(expectedSplit));
    }
  );

  it('returns list of items with missing timings', () => {
    const { missingTags } = splitByTimings(packageTags, mockTimings.tests, { nodeTotal: 3, nodeIndex: 1 });
    expect(missingTags).toEqual([p5]);
  });
});
