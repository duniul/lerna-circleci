const path = require('path');
const lernaCli = require('@lerna/cli');
const changedCommand = require('./commands/changed');
const execCommand = require('./commands/exec');
const listCommand = require('./commands/list');
const runCommand = require('./commands/run');
const { globalOptionsBuilder } = require('./globalOptions');

const lernaEntryPath = require.resolve('lerna');
const lernaPkg = lernaEntryPath && require(path.resolve(path.dirname(lernaEntryPath), 'package.json'));

function lernaCircleCiCli(argvWithoutBin) {
  let yargs = lernaCli();

  yargs = globalOptionsBuilder(yargs);

  return yargs
    .command(runCommand)
    .command(execCommand)
    .command(listCommand)
    .command(changedCommand)
    .parse(argvWithoutBin, {
      lernaVersion: lernaPkg?.version || '??',
    });
}

module.exports = lernaCircleCiCli;
