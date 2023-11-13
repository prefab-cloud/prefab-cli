oclif-hello-world
=================

oclif example Hello World CLI

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![CircleCI](https://circleci.com/gh/oclif/hello-world/tree/main.svg?style=shield)](https://circleci.com/gh/oclif/hello-world/tree/main)
[![GitHub license](https://img.shields.io/github/license/oclif/hello-world)](https://github.com/oclif/hello-world/blob/main/LICENSE)

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
* [`prefab hello PERSON`](#prefab-hello-person)
* [`prefab hello world`](#prefab-hello-world)
* [`prefab help [COMMANDS]`](#prefab-help-commands)
* [`prefab plugins`](#prefab-plugins)
* [`prefab plugins:install PLUGIN...`](#prefab-pluginsinstall-plugin)
* [`prefab plugins:inspect PLUGIN...`](#prefab-pluginsinspect-plugin)
* [`prefab plugins:install PLUGIN...`](#prefab-pluginsinstall-plugin-1)
* [`prefab plugins:link PLUGIN`](#prefab-pluginslink-plugin)
* [`prefab plugins:uninstall PLUGIN...`](#prefab-pluginsuninstall-plugin)
* [`prefab plugins reset`](#prefab-plugins-reset)
* [`prefab plugins:uninstall PLUGIN...`](#prefab-pluginsuninstall-plugin-1)
* [`prefab plugins:uninstall PLUGIN...`](#prefab-pluginsuninstall-plugin-2)
* [`prefab plugins update`](#prefab-plugins-update)

## `prefab hello PERSON`

Say hello

```
USAGE
  $ prefab hello PERSON -f <value>

ARGUMENTS
  PERSON  Person to say hello to

FLAGS
  -f, --from=<value>  (required) Who is saying hello

DESCRIPTION
  Say hello

EXAMPLES
  $ oex hello friend --from oclif
  hello friend from oclif! (./src/commands/hello/index.ts)
```

_See code: [src/commands/hello/index.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.0.0/src/commands/hello/index.ts)_

## `prefab hello world`

Say hello world

```
USAGE
  $ prefab hello world

DESCRIPTION
  Say hello world

EXAMPLES
  $ prefab hello world
  hello world! (./src/commands/hello/world.ts)
```

_See code: [src/commands/hello/world.ts](https://github.com/prefab-cloud/prefab-cli/blob/v0.0.0/src/commands/hello/world.ts)_

## `prefab help [COMMANDS]`

Display help for prefab.

```
USAGE
  $ prefab help [COMMANDS] [-n]

ARGUMENTS
  COMMANDS  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for prefab.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v5.2.20/src/commands/help.ts)_

## `prefab plugins`

List installed plugins.

```
USAGE
  $ prefab plugins [--json] [--core]

FLAGS
  --core  Show core plugins.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  List installed plugins.

EXAMPLES
  $ prefab plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.1.5/src/commands/plugins/index.ts)_

## `prefab plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ prefab plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -s, --silent   Silences yarn output.
  -v, --verbose  Show verbose yarn output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ prefab plugins add

EXAMPLES
  $ prefab plugins:install myplugin 

  $ prefab plugins:install https://github.com/someuser/someplugin

  $ prefab plugins:install someuser/someplugin
```

## `prefab plugins:inspect PLUGIN...`

Displays installation properties of a plugin.

```
USAGE
  $ prefab plugins:inspect PLUGIN...

ARGUMENTS
  PLUGIN  [default: .] Plugin to inspect.

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Displays installation properties of a plugin.

EXAMPLES
  $ prefab plugins:inspect myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.1.5/src/commands/plugins/inspect.ts)_

## `prefab plugins:install PLUGIN...`

Installs a plugin into the CLI.

```
USAGE
  $ prefab plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  Plugin to install.

FLAGS
  -f, --force    Run yarn install with force flag.
  -h, --help     Show CLI help.
  -s, --silent   Silences yarn output.
  -v, --verbose  Show verbose yarn output.

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Installs a plugin into the CLI.
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.


ALIASES
  $ prefab plugins add

EXAMPLES
  $ prefab plugins:install myplugin 

  $ prefab plugins:install https://github.com/someuser/someplugin

  $ prefab plugins:install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.1.5/src/commands/plugins/install.ts)_

## `prefab plugins:link PLUGIN`

Links a plugin into the CLI for development.

```
USAGE
  $ prefab plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

FLAGS
  -h, --help      Show CLI help.
  -v, --verbose
  --[no-]install  Install dependencies after linking the plugin.

DESCRIPTION
  Links a plugin into the CLI for development.
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.


EXAMPLES
  $ prefab plugins:link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.1.5/src/commands/plugins/link.ts)_

## `prefab plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ prefab plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ prefab plugins unlink
  $ prefab plugins remove
```

## `prefab plugins reset`

Remove all user-installed and linked plugins.

```
USAGE
  $ prefab plugins reset
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.1.5/src/commands/plugins/reset.ts)_

## `prefab plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ prefab plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ prefab plugins unlink
  $ prefab plugins remove
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.1.5/src/commands/plugins/uninstall.ts)_

## `prefab plugins:uninstall PLUGIN...`

Removes a plugin from the CLI.

```
USAGE
  $ prefab plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Removes a plugin from the CLI.

ALIASES
  $ prefab plugins unlink
  $ prefab plugins remove
```

## `prefab plugins update`

Update installed plugins.

```
USAGE
  $ prefab plugins update [-h] [-v]

FLAGS
  -h, --help     Show CLI help.
  -v, --verbose

DESCRIPTION
  Update installed plugins.
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v4.1.5/src/commands/plugins/update.ts)_
<!-- commandsstop -->
