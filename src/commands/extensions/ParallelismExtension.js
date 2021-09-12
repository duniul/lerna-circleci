const fs = require('fs');
const { LOGGER_TAG, YARGS_COMMAND_GROUP } = require('../../constants');
const { withId } = require('../../globalOptions');
const { splitByTimings, splitEvenly } = require('../../helpers/parallelism');

// CircleCI environment variables
const { CIRCLE_NODE_TOTAL, CIRCLE_NODE_INDEX, CIRCLE_INTERNAL_TASK_DATA } = process.env;

function create({ getPackages, setPackages } = {}) {
  return function parallelismExtension() {
    const original = {
      initialize: this.initialize.bind(this),
    };

    return {
      initialize: async () => {
        const { timingsFile: timingsFilePath, nodeTotal, nodeIndex } = this.options;
        const initializeChainResult = await original.initialize();

        /** Bail if original initialize step did. */
        if (initializeChainResult === false) {
          return false;
        }

        const { id, splitByTimings: shouldSplitByTimings } = this.options;
        const packages = await getPackages();
        const packageTags = packages.map((pkg) => withId(id, pkg.name));

        this.logger.info(LOGGER_TAG, `Running on parallel node ${nodeIndex + 1} out of ${nodeTotal}.`);

        let packageTagsOnNode;
        let timings;

        if (shouldSplitByTimings) {
          try {
            const timingsFile = await fs.promises.readFile(timingsFilePath);
            timings = JSON.parse(timingsFile).tests || [];
          } catch (error) {
            this.logger.warn(LOGGER_TAG, 'Could not find timings data, falling back to splitting tasks evenly.');
            this.logger.error(error);
          }
        }

        if (shouldSplitByTimings && timings) {
          const { result, missingTags } = splitByTimings(packageTags, timings, {
            nodeTotal,
            nodeIndex,
          });

          if (missingTags.length) {
            this.logger.info(LOGGER_TAG, `No timings found for ${missingTags.length}/${packageTags.length} packages.`);
            this.logger.verbose(LOGGER_TAG, missingTags.map((line) => '- ' + line).join('\n'));
          }

          packageTagsOnNode = result;
        } else {
          packageTagsOnNode = splitEvenly(packageTags, { nodeTotal, nodeIndex });
        }

        const packageTagsOnNodeSet = new Set(packageTagsOnNode);
        const packagesOnNode = packages.filter((pkg) => packageTagsOnNodeSet.has(withId(id, pkg.name)));

        await setPackages(packagesOnNode);

        if (packagesOnNode.length) {
          this.logger.info(LOGGER_TAG, `Assigned ${packageTagsOnNode.length} out of ${packages.length} packages to this node.`);
          this.logger.verbose(LOGGER_TAG, packageTagsOnNode.map((tag) => '- ' + tag).join('\n'));

          return initializeChainResult;
        } else {
          this.logger.success(LOGGER_TAG, `0 out of ${packages.length} packages were assigned to this node, skipping command!`);

          // still exits zero, aka "ok"
          return false;
        }
      },
    };
  };
}

function builder(yargs) {
  const group = YARGS_COMMAND_GROUP;

  return yargs
    .option('split-by-timings', {
      group,
      alias: 't',
      type: 'boolean',
      default: false,
      description: 'Split packages by timing data from previous CI runs. Requires an ID to be set.',
    })
    .option('timings-file', {
      group,
      type: 'string',
      default: `${CIRCLE_INTERNAL_TASK_DATA}/circle-test-results/results.json`,
      defaultDescription: '${CIRCLE_INTERNAL_TASK_DATA}/circle-test-results/results.json',
      description: 'Path to the CircleCI test results file. Uses the CircleCI default path by default. Should probably not be changed.',
    })
    .option('node-total', {
      group,
      type: 'number',
      default: CIRCLE_NODE_TOTAL ? Number.parseInt(CIRCLE_NODE_TOTAL, 10) : 1,
      defaultDescription: `$CIRCLE_NODE_TOTAL ?? 0`,
      description: "Total node count to split tasks across. Uses CircleCI's env variable by default.",
    })
    .option('node-index', {
      group,
      type: 'number',
      default: CIRCLE_NODE_INDEX ? Number.parseInt(CIRCLE_NODE_INDEX, 10) : 0,
      defaultDescription: `$CIRCLE_NODE_INDEX ?? 0`,
      description: "Current node index to run related tasks for. Uses CircleCI's env variable by default.",
    })
    .check(({ id, splitByTimings, nodeTotal, nodeIndex }) => {
      if (splitByTimings && !id) {
        throw new Error('--split-by-timings requires an ID to be set with --id.');
      }

      if (!Number.isSafeInteger(nodeTotal) || nodeTotal < 1) {
        throw new Error(`--nodeTotal must be a positive integer, was ${nodeTotal}.`);
      }

      if (!Number.isSafeInteger(nodeIndex) || nodeIndex < 0) {
        throw new Error(`--nodeIndex must be a positive integer or 0, was ${nodeIndex}.`);
      }

      if (nodeIndex > nodeTotal) {
        throw new Error(`--nodeIndex (${nodeIndex}) must be lower than --nodeTotal (${nodeTotal}).`);
      }

      return true;
    });
}

module.exports = {
  create,
  builder,
};
