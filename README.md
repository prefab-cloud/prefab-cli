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
@prefab-cloud/prefab/0.0.4 darwin-arm64 node-v18.14.2
$ prefab --help [COMMAND]
USAGE
  $ prefab COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`prefab change-default [NAME]`](#prefab-change-default-name)
* [`prefab create NAME`](#prefab-create-name)
* [`prefab get [NAME]`](#prefab-get-name)
* [`prefab info [NAME]`](#prefab-info-name)
* [`prefab list`](#prefab-list)
* [`prefab override [NAME]`](#prefab-override-name)

## `prefab change-default [NAME]`

change the default value for an environment (other rules still apply)

```
USAGE
  $ prefab change-default [NAME] --api-key <value> [--json] [--interactive] [--verbose] [--environment <value>]
    [--variant <value>]

ARGUMENTS
  NAME  config/feature-flag/etc. name

FLAGS
  --api-key=<value>      (required) Prefab API KEY (defaults to ENV var PREFAB_API_KEY)
  --environment=<value>  environment to change
  --[no-]interactive     Force interactive mode
  --variant=<value>      new default variant
  --verbose              Verbose output

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  change the default value for an environment (other rules still apply)

EXAMPLES
  $ prefab change-default my.flag.name # will prompt for variant and env

  $ prefab change-default my.flag.name --variant=true --environment=staging
```

_See code: [src/commands/change-default.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.0.4/src/commands/change-default.ts)_

## `prefab create NAME`

Create a new item in Prefab

```
USAGE
  $ prefab create NAME --api-key <value> --type boolean-flag [--json] [--interactive] [--verbose]

ARGUMENTS
  NAME  name for your new item (e.g. my.new.flag)

FLAGS
  --api-key=<value>   (required) Prefab API KEY (defaults to ENV var PREFAB_API_KEY)
  --[no-]interactive  Force interactive mode
  --type=<option>     (required)
                      <options: boolean-flag>
  --verbose           Verbose output

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Create a new item in Prefab

EXAMPLES
  $ prefab create my.new.flag --type boolean-flag
```

_See code: [src/commands/create.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.0.4/src/commands/create.ts)_

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
  $ prefab get my.config.name
```

_See code: [src/commands/get.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.0.4/src/commands/get.ts)_

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
  $ prefab info my.config.name
```

_See code: [src/commands/info.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.0.4/src/commands/info.ts)_

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

_See code: [src/commands/list.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.0.4/src/commands/list.ts)_

## `prefab override [NAME]`

Override the value of an item for your user/API key combo

```
USAGE
  $ prefab override [NAME] --api-key <value> [--json] [--interactive] [--verbose] [--remove] [--variant
    <value>]

ARGUMENTS
  NAME  config/feature-flag/etc. name

FLAGS
  --api-key=<value>   (required) Prefab API KEY (defaults to ENV var PREFAB_API_KEY)
  --[no-]interactive  Force interactive mode
  --remove            remove your override (if present)
  --variant=<value>   variant to use for your override
  --verbose           Verbose output

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Override the value of an item for your user/API key combo

EXAMPLES
  $ prefab override my.flag.name # will prompt for variant

  $ prefab override my.flag.name --variant=true

  $ prefab override my.flag.name --remove

  $ prefab override my.double.config --variant=3.14159
```

_See code: [src/commands/override.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.0.4/src/commands/override.ts)_
<!-- commandsstop -->
