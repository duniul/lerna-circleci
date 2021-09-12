const { YARGS_COMMAND_GROUP } = require('./constants');

function withId(id, str) {
  return id ? `${id}:${str}` : str;
}

function withoutId(id, str) {
  return id ? str.replace(`${id}:`, '') : str;
}

function globalOptionsBuilder(yargs) {
  return yargs
    .option('id', {
      group: YARGS_COMMAND_GROUP,
      alias: 'i',
      type: 'string',
      description: 'String used to tag reports and package timings (allows letters, numbers, - and _).',
    })
    .check(({ id }) => {
      if (id && !id.match(/^[a-zA-Z\d-_]+$/)) {
        throw new Error('--id can only be a string containing letters, digits, dash and underscore.');
      }

      return true;
    });
}

module.exports = {
  globalOptionsBuilder,
  withId,
  withoutId,
};
