Examples here are for running in a command-line environment with node.

### get-match

The command-line node example in `packages/node/get-match` should be runnable after the top level `yarn develop` (or `yarn build`). It can be used to request a record (and optionally follow a navigation link) and (optionally) pretty-print all fields in the returned records:

```
/path/to/packages/node/get-match/lib/get-match.js --help

  Usage: get-match [options]

  Options:

    -V, --version                  output the version number
    --url [url]                    ContentGateway URL (default: ams://cg-ny4-web.activfinancial.com/ContentGateway:Service)
    --userId <userId>              user id
    --password <password>          password
    --symbol <symbol>              symbol (default: MSFT)
    --relationship <relationship>  relationship (default: none)
    --no-display                   don't display records
    -h, --help                     output usage information
```

The file is self contained, aside from requiring `node` to be in the path.

Note for Windows users, there is a `cmd` script which can be run instead of the .js file in a Command Prompt / PowerShell. This avoids Windows Scripting Host trying to run the program. E.g.

```drive:\path\to\packages\node\get-match\lib\get-match --help```

### get-history

Similarly, `packages/node/get-history` demonstrates some time series requests:
```
/path/to/packages/node/get-history/lib/get-history.js --help

  Usage: get-history [options]

  Options:

    -V, --version          output the version number
    --url [url]            ContentGateway URL (default: ams://cg-ny4-web.activfinancial.com/ContentGateway:Service)
    --userId <userId>      user id
    --password <password>  password
    --symbol <symbol>      symbol (default: MSFT.)
    --no-display           don't display records
    -h, --help             output usage information
```

Note for Windows users, there is a `cmd` script which can be run instead of the .js file in a Command Prompt / PowerShell. This avoids Windows Scripting Host trying to run the program. E.g.

```drive:\path\to\packages\node\get-history\lib\get-history --help```

### Visual Studio Code

* `Launch get-match/get-history`: runs the corresponding node sample in `packages/node/*`.
