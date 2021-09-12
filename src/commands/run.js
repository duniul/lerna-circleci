const { RunCommand } = require('@lerna/run');
const lernaRunCommand = require('@lerna/run/command');
const { extendCommand, extendOptions } = require('../helpers/extensions');
const { getFilteredPackages } = require('@lerna/filter-options');
const ParallelismExtension = require('./extensions/ParallelismExtension');
const ReportsExtension = require('./extensions/ReportsExtension');

/**
 * Lerna command extension.
 */
class ExtendedRunCommand extends RunCommand {
  constructor(...args) {
    super(...args);

    const parallelismExtension = ParallelismExtension.create({
      getPackages: async () => getFilteredPackages(this.packageGraph, this.execOpts, this.options),
      setPackages: (pkgsOnNode) => {
        const pkgOnNodeNameSet = new Set(pkgsOnNode.map((pkg) => pkg.name));
        this.packagesWithScript = this.packagesWithScript.filter((pkg) => pkgOnNodeNameSet.has(pkg.name));
        this.count = pkgsOnNode.length;
        this.packagePlural = this.count === 1 ? 'package' : 'packages';
      },
    });

    const reportsExtension = ReportsExtension.create({});

    extendCommand(this, parallelismExtension, reportsExtension);
  }
}

/**
 * Yargs command options.
 */
module.exports = {
  ...lernaRunCommand,
  RunCommand: ExtendedRunCommand,
  handler: (argv) => new ExtendedRunCommand(argv),
  builder: (yargs) => extendOptions(yargs, lernaRunCommand.builder, ParallelismExtension.builder, ReportsExtension.builder),
};
