const { ChangedCommand } = require('@lerna/changed');
const lernaChangedCommand = require('@lerna/changed/command');
const listable = require('@lerna/listable');
const { extendCommand, extendOptions } = require('../helpers/extensions');
const { parseListableResult } = require('../helpers/listable');
const ParallelismExtension = require('./extensions/ParallelismExtension');

/**
 * Lerna command extension.
 */
class ExtendedChangedCommand extends ChangedCommand {
  constructor(...args) {
    super(...args);

    const parallelismExtension = ParallelismExtension.create({
      getPackages: () => {
        const { result, options, packageGraph } = this;
        return parseListableResult({ result, options, packageGraph });
      },
      setPackages: (pkgsOnNode) => {
        this.result = listable.format(pkgsOnNode, this.options);
      },
    });

    extendCommand(this, parallelismExtension);
  }
}

/**
 * Yargs command options.
 */
module.exports = {
  ...lernaChangedCommand,
  ChangedCommand: ExtendedChangedCommand,
  handler: (argv) => new ExtendedChangedCommand(argv),
  builder: (yargs) => extendOptions(yargs, lernaChangedCommand.builder, ParallelismExtension.builder),
};
