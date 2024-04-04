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
@prefab-cloud/prefab/0.2.3 darwin-arm64 node-v20.10.0
$ prefab --help [COMMAND]
USAGE
  $ prefab COMMAND
...
```
<!-- usagestop -->

# Commands

<!-- commands -->
* [`prefab create NAME`](#prefab-create-name)
* [`prefab download`](#prefab-download)
* [`prefab generate-new-hex-key`](#prefab-generate-new-hex-key)
* [`prefab get [NAME]`](#prefab-get-name)
* [`prefab info [NAME]`](#prefab-info-name)
* [`prefab interactive`](#prefab-interactive)
* [`prefab list`](#prefab-list)
* [`prefab override [NAME]`](#prefab-override-name)
* [`prefab serve DATA-FILE`](#prefab-serve-data-file)
* [`prefab set-default [NAME]`](#prefab-set-default-name)

## `prefab create NAME`

Create a new item in Prefab

```
USAGE
  $ prefab create NAME --api-key <value> --type boolean-flag|boolean|string|double|int|string-list [--json]
    [--interactive] [--no-color] [--verbose] [--confidential] [--env-var <value>] [--value <value>] [--secret]
    [--secret-key-name <value>]

ARGUMENTS
  NAME  name for your new item (e.g. my.new.flag)

FLAGS
  --confidential             mark the value as confidential
  --env-var=<value>          environment variable to get value from
  --secret                   encrypt the value of this item
  --secret-key-name=<value>  [default: prefab.secrets.encryption.key] name of the secret key to use for
                             encryption/decryption
  --type=<option>            (required)
                             <options: boolean-flag|boolean|string|double|int|string-list>
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

  $ prefab create my.new.flag --type boolean-flag --value=true

  $ prefab create my.new.string --type string --value="hello world"

  $ prefab create my.new.string --type string --value="hello world" --secret

  $ prefab create my.new.string --type string --env-var=MY_ENV_VAR_NAME
```

_See code: [src/commands/create.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.2.3/src/commands/create.ts)_

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

_See code: [src/commands/download.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.2.3/src/commands/download.ts)_

## `prefab generate-new-hex-key`

Generate a new hex key suitable for secrets

```
USAGE
  $ prefab generate-new-hex-key [--json] [--interactive] [--no-color] [--verbose]

GLOBAL FLAGS
  --[no-]interactive  Force interactive mode
  --json              Format output as json.
  --no-color          Do not colorize output
  --verbose           Verbose output

DESCRIPTION
  Generate a new hex key suitable for secrets

EXAMPLES
  $ prefab generate-new-hex-key
```

_See code: [src/commands/generate-new-hex-key.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.2.3/src/commands/generate-new-hex-key.ts)_

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

_See code: [src/commands/get.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.2.3/src/commands/get.ts)_

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

_See code: [src/commands/info.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.2.3/src/commands/info.ts)_

## `prefab interactive`

```
USAGE
  $ prefab interactive [--json] [--] [--no-color] [--verbose]

GLOBAL FLAGS
  --[no-]interactive  Force interactive mode
  --json              Format output as json.
  --no-color          Do not colorize output
  --verbose           Verbose output

EXAMPLES
  $ prefab
```

_See code: [src/commands/interactive.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.2.3/src/commands/interactive.ts)_

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

_See code: [src/commands/list.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.2.3/src/commands/list.ts)_

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

_See code: [src/commands/override.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.2.3/src/commands/override.ts)_

## `prefab serve DATA-FILE`

Serve a datafile on a local port

```
USAGE
  $ prefab serve DATA-FILE [--json] [--interactive] [--no-color] [--verbose] [--port <value>]

ARGUMENTS
  DATA-FILE  file to read

FLAGS
  --port=<value>  [default: 3099] port to serve on

GLOBAL FLAGS
  --[no-]interactive  Force interactive mode
  --json              Format output as json.
  --no-color          Do not colorize output
  --verbose           Verbose output

DESCRIPTION
  Serve a datafile on a local port

EXAMPLES
  $ prefab serve ./prefab.test.588.config.json --port=3099
```

_See code: [src/commands/serve.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.2.3/src/commands/serve.ts)_

## `prefab set-default [NAME]`

Set/update the default value for an environment (other rules still apply)

```
USAGE
  $ prefab set-default [NAME] --api-key <value> [--json] [--interactive] [--no-color] [--verbose]
    [--confidential] [--env-var <value>] [--environment <value>] [--value <value>] [--confirm] [--secret]
    [--secret-key-name <value>]

ARGUMENTS
  NAME  config/feature-flag/etc. name

FLAGS
  --confidential             mark the value as confidential
  --confirm                  confirm without prompt
  --env-var=<value>          environment variable to use as default value
  --environment=<value>      environment to change (specify "[default]" for the default environment)
  --secret                   encrypt the value of this item
  --secret-key-name=<value>  [default: prefab.secrets.encryption.key] name of the secret key to use for
                             encryption/decryption
  --value=<value>            new default value

GLOBAL FLAGS
  --api-key=<value>   (required) Prefab API KEY (defaults to ENV var PREFAB_API_KEY)
  --[no-]interactive  Force interactive mode
  --json              Format output as json.
  --no-color          Do not colorize output
  --verbose           Verbose output

DESCRIPTION
  Set/update the default value for an environment (other rules still apply)

EXAMPLES
  $ prefab set-default my.flag.name # will prompt for value and env

  $ prefab set-default my.flag.name --value=true --environment=staging

  $ prefab set-default my.flag.name --value=true --secret

  $ prefab set-default my.config.name --env-var=MY_ENV_VAR_NAME --environment=production
```

_See code: [src/commands/set-default.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.2.3/src/commands/set-default.ts)_
<!-- commandsstop -->
