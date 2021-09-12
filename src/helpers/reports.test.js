const { generateJunitReport } = require('./reports');

const mockPackageResults = [
  {
    name: 'lerna-circleci-test-package-1',
    duration: 500,
    stderr: 'oh no something happened',
    shortMessage: 'oops!',
    failed: true,
    timedOut: false,
  },
  {
    name: 'lerna-circleci-test-package-2',
    duration: 800,
    stderr: 'timed out',
    shortMessage: 'timed out',
    failed: true,
    timedOut: true,
  },
  {
    name: 'lerna-circleci-test-package-3',
    duration: 750,
    stderr: '',
    failed: false,
    timedOut: false,
  },
];

describe('generateJunitReport', () => {
  it('generates a JUnit XML report', () => {
    const result = generateJunitReport({ totalDuration: 2500, packageResults: mockPackageResults });

    expect(result).toMatchInlineSnapshot(`
"<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?>
<testsuites name=\\"\\" tests=\\"3\\" failures=\\"2\\" time=\\"2.5\\">
  <testsuite name=\\"lerna-circleci-test-package-1\\" tests=\\"1\\" skipped=\\"0\\" errors=\\"0\\" failures=\\"1\\" time=\\"2.5\\">
    <testcase name=\\"lerna-circleci-test-package-1\\" classname=\\"lerna-circleci-test-package-1\\" time=\\"0.5\\">
      <failure message=\\"oops!\\">
        oh no something happened
      </failure>
    </testcase>
  </testsuite>
  <testsuite name=\\"lerna-circleci-test-package-2\\" tests=\\"1\\" skipped=\\"0\\" errors=\\"0\\" failures=\\"1\\" time=\\"2.5\\">
    <testcase name=\\"lerna-circleci-test-package-2\\" classname=\\"lerna-circleci-test-package-2\\" time=\\"0.8\\">
      <failure message=\\"timed out\\">
        timed out
      </failure>
    </testcase>
  </testsuite>
  <testsuite name=\\"lerna-circleci-test-package-3\\" tests=\\"1\\" skipped=\\"0\\" errors=\\"0\\" failures=\\"0\\" time=\\"2.5\\">
    <testcase name=\\"lerna-circleci-test-package-3\\" classname=\\"lerna-circleci-test-package-3\\" time=\\"0.75\\">
    </testcase>
  </testsuite>
</testsuites>"
`);
  });

  it('appends ids to suite and class names', () => {
    const result = generateJunitReport({ totalDuration: 2500, packageResults: mockPackageResults, id: 'LOOKIMHERE' });

    expect(result).toMatchInlineSnapshot(`
"<?xml version=\\"1.0\\" encoding=\\"UTF-8\\"?>
<testsuites name=\\"LOOKIMHERE\\" tests=\\"3\\" failures=\\"2\\" time=\\"2.5\\">
  <testsuite name=\\"LOOKIMHERE:lerna-circleci-test-package-1\\" tests=\\"1\\" skipped=\\"0\\" errors=\\"0\\" failures=\\"1\\" time=\\"2.5\\">
    <testcase name=\\"LOOKIMHERE:lerna-circleci-test-package-1\\" classname=\\"LOOKIMHERE:lerna-circleci-test-package-1\\" time=\\"0.5\\">
      <failure message=\\"oops!\\">
        oh no something happened
      </failure>
    </testcase>
  </testsuite>
  <testsuite name=\\"LOOKIMHERE:lerna-circleci-test-package-2\\" tests=\\"1\\" skipped=\\"0\\" errors=\\"0\\" failures=\\"1\\" time=\\"2.5\\">
    <testcase name=\\"LOOKIMHERE:lerna-circleci-test-package-2\\" classname=\\"LOOKIMHERE:lerna-circleci-test-package-2\\" time=\\"0.8\\">
      <failure message=\\"timed out\\">
        timed out
      </failure>
    </testcase>
  </testsuite>
  <testsuite name=\\"LOOKIMHERE:lerna-circleci-test-package-3\\" tests=\\"1\\" skipped=\\"0\\" errors=\\"0\\" failures=\\"0\\" time=\\"2.5\\">
    <testcase name=\\"LOOKIMHERE:lerna-circleci-test-package-3\\" classname=\\"LOOKIMHERE:lerna-circleci-test-package-3\\" time=\\"0.75\\">
    </testcase>
  </testsuite>
</testsuites>"
`);
  });
});
