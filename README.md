# lerna-circleci

<a href="https://www.npmjs.com/package/lerna-circleci"><img src="https://img.shields.io/npm/v/lerna-circleci" /></a>
<a href="https://www.npmjs.com/package/lerna-circleci"><img src="https://img.shields.io/node/v-lts/lerna-circleci" /></a>

Lets Lerna monorepos fully utilize CircleCI features like [parallelism][parallelism] and [splitting tasks by timings][test-splitting].

- Automatically splits relevant Lerna commands across parallel machines
  - Supported commands: `run`, `exec`, `list`, `changed`
- Allows splitting tasks based on timing history from previous runs
- Works for any type of task, not just tests (unlike CircleCI's own CLI)

## Background

CircleCI's [parallelism feature](#parallelism) is great for splitting up heavy tasks across machines, which seems like a great fit for a
Lerna monorepo with multiple projects. However, there is no easy way to split the projects across nodes while still working with Lerna
options like `--include-dependents`, `--include-dependencies`, filters or other options that affect which projects are selected by Lerna's
commands.

There is also no convenient way to use CircleCI's [test splitting features](#test-splitting) since tests (or other tasks) are split across
multiple projects with different needs and configurations.

`lerna-circleci` means to make these features work just as well for a Lerna monorepo as any other repo 👍

## Installation

It's recommended to install `lerna-circleci` in the root of your monorepo, together with Lerna.

```bash
# npm
npm install lerna lerna-circleci --save-dev
# pnpm
pnpm add lerna lerna-circleci --save-dev
# yarn
yarn add lerna lerna-circleci --dev
```

## Usage

`lerna-circleci` can be used as a drop-in replacement for the commands listed under [Commands](#commands).

It can be used outside of CircleCI, but will just act like regular Lerna if no the expected CircleCI environment variables are not found and
no override options are passed. See the [API](#API) for more information.

### Splitting projects across parallel nodes

Simply replace `lerna` with `lerna-circleci` inside your parallel jobs:

```yml
# .circleci/config.yml

jobs:
  test:
    parallelism: 5
    steps:
      - lerna-circleci run test
```

### Splitting projects based on timing history

With the `--split-by-timings` option, projects will be split between nodes based on previous timings in order to reduce the total time
spent. If no timings history is found then the projects will just be split up evenly.

To store timing data between runs you need to pass `--report` to the `run` or `exec` command you want to store timings from. Then add a
[`store_test_results`][store_test_results] step to your CircleCI config in order to persist the timings between runs.

```yml
# .circleci/config.yml

jobs:
  test:
    parallelism: 5
    steps:
      # The two commands will be split based on the same data since they use the same ID
      - lerna circleci list --id=testId --split-by-timings
      - lerna-circleci exec --id=testId --split-by-timings --report -- exampleExec.sh
      - store_test_results:
          path: logs/lerna-circleci/testId/results.xml
```

## Commands

### `run`

```
  lerna-circleci run script [options]
```

_Be aware that Lerna's `run` filters projects that don't have a script with the specified name, so it might split tasks differently than
e.g. `list` even if they use the same ID._

Supports all of the regular [`lerna run`](https://github.com/lerna/lerna/tree/main/commands/run) options, plus:

- [`--id | -i`](#--id---i-string)
- [`--split-by-timings | -t`](#--split-by-timings---t-boolean)
- [`--report | -r`](#--report---r-boolean)
- [`--report-file | -f`](#--report-file---f-string)
- [`--timings-file`](#--timings-file-string)
- [`--node-total`](#--node-total-number)
- [`--node-index`](#--node-index-number)

### `exec`

```
  lerna-circleci exec [options] -- command
```

Supports all of the regular [`lerna exec`](https://github.com/lerna/lerna/tree/main/commands/exec) options, plus:

- [`--id | -i`](#--id---i-string)
- [`--split-by-timings | -t`](#--split-by-timings---t-boolean)
- [`--report | -r`](#--report---r-boolean)
- [`--report-file | -f`](#--report-file---f-string)
- [`--timings-file`](#--timings-file-string)
- [`--node-total`](#--node-total-number)
- [`--node-index`](#--node-index-number)

### `list`

```
  lerna-circleci list [options]
```

Supports all of the regular [`lerna list`](https://github.com/lerna/lerna/tree/main/commands/list) options, plus:

- [`--id | -i`](#--id---i-string)
- [`--split-by-timings | -t`](#--split-by-timings---t-boolean)
- [`--timings-file`](#--timings-file-string)
- [`--node-total`](#--node-total-number)
- [`--node-index`](#--node-index-number)

### `changed`

```
  lerna-circleci changed [options]
```

Supports all of the regular [`lerna changed`](https://github.com/lerna/lerna/tree/main/commands/changed) options, plus:

- [`--id | -i`](#--id---i-string)
- [`--split-by-timings | -t`](#--split-by-timings---t-boolean)
- [`--timings-file`](#--timings-file-string)
- [`--node-total`](#--node-total-number)
- [`--node-index`](#--node-index-number)

## Options

All regular Lerna commands work with the `lerna-circleci` commands.

### Global options

Global options can be passed to any command.

#### `--id | -i` [string]

String used to tag reports and package timings. The ID should only contain letters, numbers, `-` and `_`.

Required in order to make use of timings features (like `--split-by-timings` and `--report`).

### Parallelism options

#### `--split-by-timings | -t` [boolean]

Determines whether or not to split the command by timings or not.

Requires an ID to be set with [`--id`](#--id---i-string).

#### `--timings-file` [string]

Path to the CircleCI test results file. Uses the CircleCI default path by default. Should probably not be changed.

#### `--node-total` [number]

Total node count to split tasks across. Uses CircleCI's env variable by default (`CIRCLE_NODE_TOTAL`).Must be 1 or higher.

#### `--node-index` [number]

Current node index to run related tasks for. Uses CircleCI's env variable by default (`CIRCLE_NODE_INDEX`).

Must be 0 or higher, and lower than `--node-total`.

### Report options

#### `--report | -r` [boolean]

Compatible with: `run`, `exec`

Generates a JUnit report containing timing data for all tasks performed by the command. The report should be passed to CircleCI's
[`store_test_results`][store_test_results] step in order to use the results in future runs.

Requires an ID to be set with [`--id`](#--id---i-string).

#### `--report-file | -f` [string]

Compatible with: `run`, `exec`

Generates a JUnit report containing timing data for all tasks performed by the command. The report should be passed to CircleCI's
[`store_test_results`][store_test_results] step in order to use the results in future runs.

Requires an ID to be set with [`--id`](#--id---i-string).

## FAQ

#### How does this relate to Lerna's `--concurrency` and `--parallel` options?

Lerna's `--concurrency` and `--parallel` only affects how Lerna runs command on the current machine. They can be safely used together with
`lerna-circleci`, though it's recommended to avoid `--parallel` in general.

#### Can this be used with other CI providers?

As the name implies, `lerna-circleci` is tailored for CircleCI (and their parallelism features in particular). That said, it's still
possible to simulate the parallelism in most other CI providers by defining multiple jobs and using the `--nodeTotal` and `--nodeIndex`
parameters to separate split tasks between jobs in the same way.

[parallelism]: https://circleci.com/docs/2.0/parallelism-faster-jobs/
[test-splitting]: https://circleci.com/docs/2.0/parallelism-faster-jobs/#using-the-circleci-cli-to-split-tests
[store_test_results]: https://circleci.com/docs/2.0/configuration-reference/#store_test_results
