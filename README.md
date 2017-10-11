# DEADC0DE

Find unused modules in your project!

Inject this module to your project, run it and it will check all your requires
 and generate report which contains used and unused project files.

It will work with:

* dynamic requires
* rewrited node path

Call it like this

```javascript
require('DEADC0DE')({delay:18000, terminate: false,reportDir:'/home/jehy/tmp'});
```

Options are optional, and those are:

* `delay` wait some time before all requires are processed. Default to 5000 millis.
* `terminate` exit process after work is done. Default true.
* `reportDir` where to put report files. If no dir provided, report will output to console.
* `path` application root path. If no provided, it will be calculated.