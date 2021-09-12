function extendCommand(cmdThis, ...extensions) {
  extensions.forEach((extension) => {
    const boundExtension = extension.bind(cmdThis);
    Object.assign(cmdThis, boundExtension());
  });
}

function extendOptions(initialYargs, ...optionBuilders) {
  return optionBuilders.reduce((yargs, builder) => builder(yargs), initialYargs);
}

module.exports = {
  extendCommand,
  extendOptions,
};
