/**
 * If running on Nodejs below 4.x, we load the transpiled code.
 * Otherwise, we use the ES6 code.
 */

/* eslint-disable global-require, no-var */

'use strict';

var majorVersion = parseInt(process.versions.node.split('.')[0], 10);
if (majorVersion < 4) {
  module.exports = require('./lib/index.js');
} else {
  module.exports = require('./src/index.js');
}
