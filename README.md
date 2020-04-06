# Pingdom Configurator

> Configure Pingdom as described in the config file.

## Install

```bash
$ npm install -g git+https://github.com/ovh/pingdom-configurator.git
```

## Prerequisites

You need to have a Pingdom account, and a API Token (RW). You can generate it in the Pingdom control panel, in the "Integrations -> The Pingdom API" section.

See more informations [here](https://docs.pingdom.com/api/#section/Authentication).

## Usage

```bash
$ pingdom-configurator --help

  Usage: pingdom-configurator [options]

  Pingdom Configurator

  Options:
    --config <config>  The location of your config file.
    --dry-run          Dry Run mode (default: false)
    --soft             Soft mode. Will not delete checks, but pause them (default: false)
    -h, --help         output usage information
```

### Example

```bash
$ pingdom-configurator --config="/path/to/config/file" [--dry-run] [--soft]
```

You can use `--dry-run` to simulate the calls to Pingdom (don't modify anything).

You can use `--soft` to not delete removed checks, but pause them instead.

## Configuration

Create a **YAML** (or **JSON**) file `config.yaml`, with the following configuration:

```yaml
apiToken: ''                 # (required) Your Pingdom API token
filterTags: []               # (optional) Array of tags, to filter the checks
filterRegex: ''              # (optional) A regex to filter the checks
checksCommonConfig: {}       # (optional) A check config object common for all checks
checks: [{}]                 # Array of checks config
tmsChecksCommonConfig: {}    # (optional) A TMS check config object common for all checks
tmsChecks: [{}]              # Array of TMS checks config
```

Example:

```yaml
apiToken: XXXXXXXXXXXXXXXXXXX
checksCommonConfig:
  type: http
  encryption: true
  resolution: 1
  sendnotificationwhendown: 5
  notifyagainevery: 5
  notifywhenbackup: true
  responsetime_threshold: 4000
  integrationids: '42'
checks:
  - name: ovh.com/fr/ (from EU)
    host: ovh.com
    url: /fr/
    probe_filters:
      - region:EU
  - name: ovh.com/fr/ (from NA)
    host: ovh.com
    url: /fr/
    probe_filters:
      - region:NA
tmsChecksCommonConfig:
  interval: 5
  send_notification_when_down: 3
tmsChecks:
  - name: A sample scenario
    region: eu
    steps:
      - fn: go_to
        args:
          url: https://www.ovh.com/fr/
      - fn: click
        args:
          element: a#menu_customer_not_logged
```

The checks configurations are the same than inside the API: [checks](https://docs.pingdom.com/api/#tag/Checks/paths/~1checks/post) & [TMs checks](https://docs.pingdom.com/api/#operation/addCheck).

Note: You can create your config file in **YAML** or **JSON** format.

## Related

- [pingdom-to-graphite](https://github.com/ovh/pingdom-to-graphite) - A tool for copying metrics from Pingdom to Graphite

## License

[BSD-3-Clause](LICENSE) © OVH SAS
