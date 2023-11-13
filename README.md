Prefab CLI
=================

<!-- toc -->
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->
```sh-session
$ npm install -g @prefab-cloud/prefab
$ prefab COMMAND
running command...
$ prefab (--version)
@prefab-cloud/prefab/0.0.0 darwin-arm64 node-v18.14.2
$ prefab --help [COMMAND]
USAGE
  $ prefab COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`prefab list`](#prefab-list)

## `prefab list`

show keys for your config/flags/etc.

```
USAGE
  $ prefab list [--configs] [--flags] [--logLevels] [--segments] [--apiKey <value>]

FLAGS
  --apiKey=<value>
  --configs
  --flags
  --logLevels
  --segments

DESCRIPTION
  show keys for your config/flags/etc.

  All types are returned by default. If you pass one or more flags, only those types will be returned

EXAMPLES
  $ prefab list

  $ prefab list --flags
```

_See code: [src/commands/list.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.0.0/src/commands/list.ts)_
<!-- commandsstop -->
