# DEADC0DE

Find unused modules in your project!

Inject this module to entry point of your project, run it and it
 will check all your requires
 and generate report which contains used and unused project files.

It will work with:

* dynamic requires
* rewrited node path

Call it like this

```javascript
require('DEADC0DE')({delay:18000, terminate: false,reportDir:'/home/jehy/tmp'});
```

## Options

Options are optional, and those are:

* `delay` wait some time before all requires are processed. Default to 5000 millis.
* `terminate` exit process after work is done. Default true.
* `reportDir` where to put report files. If no dir provided (default), report will output to console.
* `reportJson` if true - use JSON format for reports (only applicable with `reportDir`). Default false.
* `path` application root path. If no provided, it will be calculated.
* `info` some debug info for logging (for example whe you call DEADCODE several times)

## Scripts

### Requires

It is a script for statical requires analization. It parses all files, beginning
from the main one(s), and compares them with files total.

Parameters:
* `dir` directory with all code that you want to check
* `file` entry point(s), separated by comma
* `nodePath` additional node pathes if you need
* `nodeModules` path to node modules of project being checked
* `reportDir` where to output report
* `verbose` write tons of logs to console

### Analyze
It is a  script for analyzing intersection in non used modules
from several logs in JSON format.

You can use this command like

```npm run analyze -- --dir=/home/jehy/tmp/```

(dir is a directory with your reports)

to generate file with all modules that are not used in all reports.

## Compatibility

* injectable code is compatible with node 0.11+.
* command line scripts are compatible with node 8+ (possibly 4+).