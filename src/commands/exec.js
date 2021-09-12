const { ExecCommand } = require('@lerna/exec');
const lernaExecCommand = require('@lerna/exec/command');
const { extendCommand, extendOptions } = require('../helpers/extensions');
const ParallelismExtension = require('./extensions/ParallelismExtension');
const ReportsExtension = require('./extensions/ReportsExtension');

/**
 * Lerna command extension.
 */
class ExtendedExecCommand extends ExecCommand {
  constructor(...args) {
    super(...args);

    const parallelismExtension = ParallelismExtension.create({
      getPackages: () => this.filteredPackages,
      setPackages: (pkgsOnNode) => {
        this.filteredPackages = pkgsOnNode;
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
  ...lernaExecCommand,
  ExecCommand: ExtendedExecCommand,
  handler: (argv) => new ExtendedExecCommand(argv),
  builder: (yargs) => extendOptions(yargs, lernaExecCommand.builder, ParallelismExtension.builder, ReportsExtension.builder),
};
