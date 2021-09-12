const { ListCommand } = require('@lerna/list');
const lernaListCommand = require('@lerna/list/command');
const listable = require('@lerna/listable');
const { extendCommand, extendOptions } = require('../helpers/extensions');
const { parseListableResult } = require('../helpers/listable');
const ParallelismExtension = require('./extensions/ParallelismExtension');

/**
 * Lerna command extension.
 */
class ExtendedListCommand extends ListCommand {
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
  ...lernaListCommand,
  ListCommand: ExtendedListCommand,
  handler: (argv) => new ExtendedListCommand(argv),
  builder: (yargs) => extendOptions(yargs, lernaListCommand.builder, ParallelismExtension.builder),
};
