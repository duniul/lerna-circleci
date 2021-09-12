const { YARGS_COMMAND_GROUP, LOGGER_TAG } = require('../../constants');
const { writeFileRecursive } = require('../../helpers/fs');
const { generateJunitReport } = require('../../helpers/reports');

function create() {
  return function reportsExtension() {
    const original = {
      getRunner: this.getRunner.bind(this),
      execute: this.execute.bind(this),
    };

    return {
      packageResults: [],

      execute: () => {
        const startMs = Date.now();
        return original.execute().then(async () => {
          const totalDuration = Date.now() - startMs;

          if (this.options.report) {
            const { id, reportFile: customReportFile } = this.options;
            const reportFile = customReportFile || `logs/lerna-circleci/${id}/results.xml`;
            const report = generateJunitReport({ totalDuration, id, packageResults: this.packageResults });

            this.logger.info(LOGGER_TAG, `Writing report results to ${reportFile}.`);
            await writeFileRecursive(reportFile, report);
          }
        });
      },

      getRunner: () => {
        const runner = original.getRunner();
        return (pkg) => {
          const startMs = Date.now();
          return runner(pkg).then((result) => {
            this.packageResults.push({ name: pkg.name, duration: Date.now() - startMs, ...result });
            return result;
          });
        };
      },
    };
  };
}

function builder(yargs) {
  return yargs
    .option('report', {
      group: YARGS_COMMAND_GROUP,
      alias: 'r',
      type: 'boolean',
      description: 'Generates a CircleCI-compatible JUnit report at the path specified by the --report-file. Requires an ID to be set.',
    })
    .option('report-file', {
      group: YARGS_COMMAND_GROUP,
      alias: 'f',
      type: 'string',
      defaultDescription: 'logs/lerna-circleci/${id}/results.xml',
      description:
        "Path to where the generated report should be written. Should also be passed to CircleCI's `store_test_results` command.",
    })
    .check(({ report, id }) => {
      if (report && !id) {
        throw new Error('--report requires an ID to be set with --id.');
      }

      return true;
    });
}

module.exports = {
  create,
  builder,
};
