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
@prefab-cloud/prefab/0.0.3 darwin-arm64 node-v18.14.2
$ prefab --help [COMMAND]
USAGE
  $ prefab COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`prefab get [NAME]`](#prefab-get-name)
* [`prefab info [NAME]`](#prefab-info-name)
* [`prefab list`](#prefab-list)

## `prefab get [NAME]`

Get the value of a config/feature-flag/etc.

```
USAGE
  $ prefab get [NAME] --api-key <value> [--json] [--interactive] [--verbose]

ARGUMENTS
  NAME  config/feature-flag/etc. name

FLAGS
  --api-key=<value>   (required) Prefab API KEY (defaults to ENV var PREFAB_API_KEY)
  --[no-]interactive  Force interactive mode
  --verbose           Verbose output

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Get the value of a config/feature-flag/etc.

EXAMPLES
  $ prefab get
```

_See code: [src/commands/get.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.0.3/src/commands/get.ts)_

## `prefab info [NAME]`

Show details about the provided config/feature-flag/etc.

```
USAGE
  $ prefab info [NAME] --api-key <value> [--json] [--interactive] [--verbose] [--exclude-evaluations]

ARGUMENTS
  NAME  config/feature-flag/etc. name

FLAGS
  --api-key=<value>      (required) Prefab API KEY (defaults to ENV var PREFAB_API_KEY)
  --exclude-evaluations  Exclude evaluation data
  --[no-]interactive     Force interactive mode
  --verbose              Verbose output

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Show details about the provided config/feature-flag/etc.

EXAMPLES
  $ prefab info
```

_See code: [src/commands/info.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.0.3/src/commands/info.ts)_

## `prefab list`

show keys for your config/feature flags/etc.

```
USAGE
  $ prefab list --api-key <value> [--json] [--interactive] [--verbose] [--configs] [--feature-flags]
    [--log-levels] [--segments]

FLAGS
  --api-key=<value>   (required) Prefab API KEY (defaults to ENV var PREFAB_API_KEY)
  --configs           include configs
  --feature-flags     include flags
  --[no-]interactive  Force interactive mode
  --log-levels        include log levels
  --segments          include segments
  --verbose           Verbose output

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  show keys for your config/feature flags/etc.

  All types are returned by default. If you pass one or more type flags (e.g. --configs), only those types will be
  returned

EXAMPLES
  $ prefab list

  $ prefab list --feature-flags
```

_See code: [src/commands/list.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.0.3/src/commands/list.ts)_
<!-- commandsstop -->
