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
@prefab-cloud/prefab/0.0.11 darwin-arm64 node-v18.14.2
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
* [`prefab download`](#prefab-download)
* [`prefab get [NAME]`](#prefab-get-name)
* [`prefab info [NAME]`](#prefab-info-name)
* [`prefab list`](#prefab-list)
* [`prefab override [NAME]`](#prefab-override-name)

## `prefab change-default [NAME]`

Change the default value for an environment (other rules still apply)

```
USAGE
  $ prefab change-default [NAME] --api-key <value> [--json] [--interactive] [--no-color] [--verbose] [--environment
    <value>] [--value <value>] [--confirm]

ARGUMENTS
  NAME  config/feature-flag/etc. name

FLAGS
  --confirm              confirm without prompt
  --environment=<value>  environment to change
  --value=<value>        new default value

GLOBAL FLAGS
  --api-key=<value>   (required) Prefab API KEY (defaults to ENV var PREFAB_API_KEY)
  --[no-]interactive  Force interactive mode
  --json              Format output as json.
  --no-color          Do not colorize output
  --verbose           Verbose output

DESCRIPTION
  Change the default value for an environment (other rules still apply)

EXAMPLES
  $ prefab change-default my.flag.name # will prompt for value and env

  $ prefab change-default my.flag.name --value=true --environment=staging
```

_See code: [src/commands/change-default.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.0.11/src/commands/change-default.ts)_

## `prefab create NAME`

Create a new item in Prefab

```
USAGE
  $ prefab create NAME --api-key <value> --type boolean-flag|string [--json] [--interactive] [--no-color]
    [--verbose] [--secret] [--secret-key-name <value>] [--value <value>]

ARGUMENTS
  NAME  name for your new item (e.g. my.new.flag)

FLAGS
  --secret                   create a secret flag
  --secret-key-name=<value>  [default: prefab.secrets.encryption.key] name of the secret key to use for encryption
  --type=<option>            (required)
                             <options: boolean-flag|string>
  --value=<value>            default value for your new item

GLOBAL FLAGS
  --api-key=<value>   (required) Prefab API KEY (defaults to ENV var PREFAB_API_KEY)
  --[no-]interactive  Force interactive mode
  --json              Format output as json.
  --no-color          Do not colorize output
  --verbose           Verbose output

DESCRIPTION
  Create a new item in Prefab

EXAMPLES
  $ prefab create my.new.flag --type boolean-flag
```

_See code: [src/commands/create.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.0.11/src/commands/create.ts)_

## `prefab download`

Download a Datafile for a given environment

```
USAGE
  $ prefab download --api-key <value> [--json] [--interactive] [--no-color] [--verbose] [--environment <value>]

FLAGS
  --environment=<value>  environment to download

GLOBAL FLAGS
  --api-key=<value>   (required) Prefab API KEY (defaults to ENV var PREFAB_API_KEY)
  --[no-]interactive  Force interactive mode
  --json              Format output as json.
  --no-color          Do not colorize output
  --verbose           Verbose output

DESCRIPTION
  Download a Datafile for a given environment

EXAMPLES
  $ prefab download --environment=test
```

_See code: [src/commands/download.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.0.11/src/commands/download.ts)_

## `prefab get [NAME]`

Get the value of a config/feature-flag/etc.

```
USAGE
  $ prefab get [NAME] --api-key <value> [--json] [--interactive] [--no-color] [--verbose]

ARGUMENTS
  NAME  config/feature-flag/etc. name

GLOBAL FLAGS
  --api-key=<value>   (required) Prefab API KEY (defaults to ENV var PREFAB_API_KEY)
  --[no-]interactive  Force interactive mode
  --json              Format output as json.
  --no-color          Do not colorize output
  --verbose           Verbose output

DESCRIPTION
  Get the value of a config/feature-flag/etc.

EXAMPLES
  $ prefab get my.config.name
```

_See code: [src/commands/get.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.0.11/src/commands/get.ts)_

## `prefab info [NAME]`

Show details about the provided config/feature-flag/etc.

```
USAGE
  $ prefab info [NAME] --api-key <value> [--json] [--interactive] [--no-color] [--verbose]
    [--exclude-evaluations]

ARGUMENTS
  NAME  config/feature-flag/etc. name

FLAGS
  --exclude-evaluations  Exclude evaluation data

GLOBAL FLAGS
  --api-key=<value>   (required) Prefab API KEY (defaults to ENV var PREFAB_API_KEY)
  --[no-]interactive  Force interactive mode
  --json              Format output as json.
  --no-color          Do not colorize output
  --verbose           Verbose output

DESCRIPTION
  Show details about the provided config/feature-flag/etc.

EXAMPLES
  $ prefab info my.config.name
```

_See code: [src/commands/info.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.0.11/src/commands/info.ts)_

## `prefab list`

Show keys for your config/feature flags/etc.

```
USAGE
  $ prefab list --api-key <value> [--json] [--interactive] [--no-color] [--verbose] [--configs]
    [--feature-flags] [--log-levels] [--segments]

FLAGS
  --configs        include configs
  --feature-flags  include flags
  --log-levels     include log levels
  --segments       include segments

GLOBAL FLAGS
  --api-key=<value>   (required) Prefab API KEY (defaults to ENV var PREFAB_API_KEY)
  --[no-]interactive  Force interactive mode
  --json              Format output as json.
  --no-color          Do not colorize output
  --verbose           Verbose output

DESCRIPTION
  Show keys for your config/feature flags/etc.

  All types are returned by default. If you pass one or more type flags (e.g. --configs), only those types will be
  returned

EXAMPLES
  $ prefab list

  $ prefab list --feature-flags
```

_See code: [src/commands/list.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.0.11/src/commands/list.ts)_

## `prefab override [NAME]`

Override the value of an item for your user/API key combo

```
USAGE
  $ prefab override [NAME] --api-key <value> [--json] [--interactive] [--no-color] [--verbose] [--remove]
    [--value <value>]

ARGUMENTS
  NAME  config/feature-flag/etc. name

FLAGS
  --remove         remove your override (if present)
  --value=<value>  value to use for your override

GLOBAL FLAGS
  --api-key=<value>   (required) Prefab API KEY (defaults to ENV var PREFAB_API_KEY)
  --[no-]interactive  Force interactive mode
  --json              Format output as json.
  --no-color          Do not colorize output
  --verbose           Verbose output

DESCRIPTION
  Override the value of an item for your user/API key combo

EXAMPLES
  $ prefab override # will prompt for name and value

  $ prefab override my.flag.name --value=true

  $ prefab override my.flag.name --remove

  $ prefab override my.double.config --value=3.14159
```

_See code: [src/commands/override.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.0.11/src/commands/override.ts)_
<!-- commandsstop -->
