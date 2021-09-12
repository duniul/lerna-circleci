#! /usr/bin/env node

const lernaCircleci = require('../src/index');

const argvWithoutBin = process.argv.slice(2);

lernaCircleci(argvWithoutBin);
