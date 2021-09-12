const path = require('path');
const fs = require('fs');
const tmp = require('tmp-promise');
const { execAsync } = require('./helpers/childProcess');
const { LOGGER_TAG } = require('./constants');

const cliPath = require.resolve('../bin/cli.js');
const testMonorepoDir = path.resolve(__dirname, './__fixtures__/test-monorepo');
const testPackagesPath = path.resolve(testMonorepoDir, 'packages');
const mockTimingsPath = path.resolve(testMonorepoDir, 'mockTimings.json');

const packages = fs.readdirSync(testPackagesPath).map((dir) => require(path.resolve(testPackagesPath, `${dir}/package.json`)));
const [p1, p2, p3, p4, p5] = packages;

const expectedEvenSplits = [
  [1, 0, packages],
  [2, 0, [p1, p2, p3]],
  [2, 1, [p4, p5]],
  [5, 0, [p1]],
  [5, 4, [p5]],
  [3, 1, [p3, p4]],
  [3, 2, [p5]],
];

const expectedTimingSplits = [
  [1, 0, packages],
  [2, 0, [p1, p2]],
  [2, 1, [p3, p4, p5]],
  [5, 0, [p1]],
  [3, 1, [p3]],
  [3, 2, [p4, p2, p5]],
];

async function execCliWithArgs(args) {
  return execAsync(`node ${cliPath} ${args}`, { cwd: testMonorepoDir });
}

const getNodeInfoLog = ({ nodeIndex, nodeTotal }) =>
  `lerna info ${LOGGER_TAG} Running on parallel node ${nodeIndex + 1} out of ${nodeTotal}.`;
const getSplitInfoLog = ({ expectedCount }) =>
  `lerna info ${LOGGER_TAG} Assigned ${expectedCount} out of ${packages.length} packages to this node.`;
const getCommandsInfoLog = ({ expectedCount }) => `lerna info Executing command in ${expectedCount} package`;

const missingTimingsInfo = `lerna info ${LOGGER_TAG} No timings found for 1/5 packages.`;
const invalidTimingsWarning = `lerna WARN ${LOGGER_TAG} Could not find timings data, falling back to splitting tasks evenly.`;

function reportsDescribeBlock({ command, extraArgs }) {
  function getCommandString(optionsString) {
    return `${command} ${optionsString || ''} ${extraArgs || ''}`;
  }

  describe('report generation', () => {
    let tempReportFile;

    async function readTempFile() {
      const buffer = await fs.promises.readFile(tempReportFile.path);
      return buffer.toString().replace(/time="[^"]+"/g, 'time="0.00"');
    }

    beforeEach(async () => {
      tempReportFile = await tmp.file();
    });

    afterEach(async () => {
      if (tempReportFile?.cleanup) {
        await tempReportFile.cleanup();
      }
    });

    it('saves JUnit XML report', async () => {
      const { stderr } = await execCliWithArgs(
        getCommandString(`--id=test --nodeTotal=5 --nodeIndex=0 --report --report-file ${tempReportFile.path}`)
      );

      const tempFileContent = await readTempFile();

      expect(stderr).toContain(`Writing report results to ${tempReportFile.path}.`);
      expect(tempFileContent).toMatchInlineSnapshot(`
        "<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?>
        <testsuites name=\\"test\\" tests=\\"1\\" failures=\\"0\\" time=\\"0.00\\">
          <testsuite name=\\"test:lerna-circleci-test-package-1\\" tests=\\"1\\" skipped=\\"0\\" errors=\\"0\\" failures=\\"0\\" time=\\"0.00\\">
            <testcase name=\\"test:lerna-circleci-test-package-1\\" classname=\\"test:lerna-circleci-test-package-1\\" time=\\"0.00\\">
            </testcase>
          </testsuite>
        </testsuites>"
      `);
    });

    it('prefixes id to report names', async () => {
      const id = 'test';
      await execCliWithArgs(getCommandString(`--id=${id} --nodeTotal=5 --nodeIndex=0 --report --report-file ${tempReportFile.path}`));

      const tempFileContent = await readTempFile();

      expect(tempFileContent).toContain(`<testsuites name="${id}"`);
      expect(tempFileContent).toContain(`<testsuite name="${id}:lerna-circleci-test-package-1"`);
      expect(tempFileContent).toContain(`<testcase name="${id}:lerna-circleci-test-package-1"`);
      expect(tempFileContent).toContain(` classname="${id}:lerna-circleci-test-package-1"`);
    });
  });
}

describe('command: run', () => {
  const command = 'run test';

  function getCommandString(optionsString) {
    return `${command} ${optionsString || ''}`;
  }

  async function testSplit({ nodeTotal, nodeIndex, expectedPkgs, extraOptions }) {
    const { stdout, stderr } = await execCliWithArgs(
      getCommandString(`--nodeTotal=${nodeTotal} --nodeIndex=${nodeIndex} ${extraOptions || ''}`)
    );

    const expectedCount = expectedPkgs.length;

    // logs expected info
    expect(stderr).toContain(getNodeInfoLog({ nodeTotal, nodeIndex }));
    expect(stderr).toContain(getSplitInfoLog({ expectedCount }));
    expect(stderr).toContain(getCommandsInfoLog({ expectedCount }));
    expect(stderr).toContain(`lerna success run Ran npm script 'test' in ${expectedCount} package`);

    const runMessage = "lerna info run Ran npm script 'test' in";

    // only runs command in expected number of packages
    expect(stderr.match(new RegExp(runMessage, 'g'))).toHaveLength(expectedCount);

    // runs command in expected packages
    expectedPkgs.forEach(({ name, scripts }) => {
      expect(stderr).toContain(`${runMessage} '${name}'`);
      expect(stdout).toContain(`> ${scripts.test}`);
    });
  }

  describe('even package splitting', () => {
    it.each(expectedEvenSplits)('splits packages evenly when --nodeTotal=%d --nodeIndex=%d', async (nodeTotal, nodeIndex, expectedPkgs) => {
      await testSplit({ nodeTotal, nodeIndex, expectedPkgs });
    });
  });

  describe('package splitting by timings', () => {
    it.each(expectedTimingSplits)(
      'splits packages by timings when --nodeTotal=%d --nodeIndex=%d',
      async (nodeTotal, nodeIndex, expectedPkgs) => {
        await testSplit({
          nodeTotal,
          nodeIndex,
          expectedPkgs,
          extraOptions: `--id=test --timings-file="${mockTimingsPath}" --split-by-timings`,
        });
      }
    );

    it('notifies info about missing packages', async () => {
      const { stderr } = await execCliWithArgs(getCommandString(`--id=test --timings-file="${mockTimingsPath}" --split-by-timings`));
      expect(stderr).toContain(missingTimingsInfo);
    });

    it('warns about invalid timings file path', async () => {
      const { stderr } = await execCliWithArgs(
        getCommandString(`--id=test --timings-file="invalid/file/path/results.json" --split-by-timings`)
      );

      expect(stderr).toContain(invalidTimingsWarning);
    });
  });

  reportsDescribeBlock({ command });
});

describe('command: exec', () => {
  const command = 'exec';
  const extraArgs = ' -- ls';

  function getCommandString(optionsString) {
    return `${command} ${optionsString || ''} ${extraArgs}`;
  }

  async function testSplit({ nodeTotal, nodeIndex, expectedPkgs, extraOptions }) {
    const { stderr } = await execCliWithArgs(
      getCommandString(`--id=test --nodeTotal=${nodeTotal} --nodeIndex=${nodeIndex} ${extraOptions || ''}`)
    );

    const expectedCount = expectedPkgs.length;

    // logs expected info
    expect(stderr).toContain(getNodeInfoLog({ nodeTotal, nodeIndex }));
    expect(stderr).toContain(getSplitInfoLog({ expectedCount }));
    expect(stderr).toContain(getCommandsInfoLog({ expectedCount }));
    expect(stderr).toContain(`lerna success exec Executed command in ${expectedCount} package`);
  }

  describe('even package splitting', () => {
    it.each(expectedEvenSplits)('splits packages evenly when --nodeTotal=%d --nodeIndex=%d', async (nodeTotal, nodeIndex, expectedPkgs) => {
      await testSplit({ nodeTotal, nodeIndex, expectedPkgs });
    });
  });

  describe('package splitting by timings', () => {
    it.each(expectedTimingSplits)(
      'splits packages by timings when --nodeTotal=%d --nodeIndex=%d',
      async (nodeTotal, nodeIndex, expectedPkgs) => {
        await testSplit({ nodeTotal, nodeIndex, expectedPkgs, extraOptions: `--timings-file="${mockTimingsPath}" --split-by-timings` });
      }
    );

    it('notifies info about missing packages', async () => {
      const { stderr } = await execCliWithArgs(getCommandString(`--id=test --timings-file="${mockTimingsPath}" --split-by-timings`));
      expect(stderr).toContain(missingTimingsInfo);
    });

    it('warns about invalid timings file path', async () => {
      const { stderr } = await execCliWithArgs(
        getCommandString(`--id=test --timings-file="invalid/file/path/results.json" --split-by-timings`)
      );
      expect(stderr).toContain(invalidTimingsWarning);
    });
  });

  reportsDescribeBlock({ command, extraArgs });
});

describe('command: list', () => {
  const command = 'list --all';

  function getCommandString(optionsString) {
    return `${command} ${optionsString || ''}`;
  }

  async function testSplit({ nodeTotal, nodeIndex, expectedPkgs, extraOptions }) {
    const { stderr } = await execCliWithArgs(getCommandString(`--nodeTotal=${nodeTotal} --nodeIndex=${nodeIndex} ${extraOptions || ''}`));

    const expectedCount = expectedPkgs.length;

    // logs expected info
    expect(stderr).toContain(getNodeInfoLog({ nodeTotal, nodeIndex }));
    expect(stderr).toContain(getSplitInfoLog({ expectedCount }));
    expect(stderr).toContain(`lerna success found ${expectedCount} package`);
  }

  describe('even package splitting', () => {
    it.each(expectedEvenSplits)('splits packages evenly when --nodeTotal=%d --nodeIndex=%d', async (nodeTotal, nodeIndex, expectedPkgs) => {
      await testSplit({ nodeTotal, nodeIndex, expectedPkgs });
    });
  });

  describe('package splitting by timings', () => {
    it.each(expectedTimingSplits)(
      'splits packages by timings when --nodeTotal=%d --nodeIndex=%d',
      async (nodeTotal, nodeIndex, expectedPkgs) => {
        await testSplit({
          nodeTotal,
          nodeIndex,
          expectedPkgs,
          extraOptions: `--id=test --timings-file="${mockTimingsPath}" --split-by-timings`,
        });
      }
    );

    it('notifies info about missing packages', async () => {
      const { stderr } = await execCliWithArgs(getCommandString(`--id=test --timings-file="${mockTimingsPath}" --split-by-timings`));
      expect(stderr).toContain(missingTimingsInfo);
    });

    it('warns about invalid timings file path', async () => {
      const { stderr } = await execCliWithArgs(
        getCommandString(`--id=test --timings-file="invalid/file/path/results.json" --split-by-timings`)
      );
      expect(stderr).toContain(invalidTimingsWarning);
    });
  });
});

/**
 * The `changed` command cannot be tested same way as the others since it depends on the Git status of the repo.
 * The command extension does works almost exactly the same as the one for `list` though.
 */
describe('command: changed', () => {
  const command = 'changed --all';

  function getCommandString(optionsString) {
    return `${command} ${optionsString || ''}`;
  }

  it('notifies info about missing packages', async () => {
    const { stderr } = await execCliWithArgs(getCommandString(`--id=test --timings-file="${mockTimingsPath}" --split-by-timings`));
    expect(stderr).toContain(missingTimingsInfo);
  });

  it('warns about invalid timings file path', async () => {
    const { stderr } = await execCliWithArgs(
      getCommandString(`--id=test --timings-file="invalid/file/path/results.json" --split-by-timings`)
    );
    expect(stderr).toContain(invalidTimingsWarning);
  });
});
