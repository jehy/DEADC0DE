'use strict';

var klaw = require('klaw');
var Promise = require('bluebird');
var path = require('path');
var fs = require('fs');
var uuid = require('uuid/v4');
var objectAssignPolyfill = require('object-assign');

if (typeof Object.assign === 'undefined') {
  // need for library modules
  Object.assign = objectAssignPolyfill;
}
var APP_INIT_TIME = 5000;

function isModule(filename) {
  return filename.indexOf('/node_modules/') === -1 && filename.indexOf('/test/') === -1 && filename.indexOf('/tests/') === -1 && filename.indexOf('/bin/') === -1 && filename.indexOf('/conf/') === -1 && filename.indexOf('/DEADC0DE/') === -1 && filename.indexOf('/.git/') === -1 && path.basename(filename) !== 'package.json' && path.basename(filename) !== 'package-lock.json' && (path.extname(filename) === '.js' || path.extname(filename) === '.json');
}

function sharedStart(array) {
  var A = array.concat().sort(),
      a1 = A[0],
      a2 = A[A.length - 1],
      L = a1.length;
  var i = 0;
  while (i < L && a1.charAt(i) === a2.charAt(i)) {
    i++;
  }return a1.substring(0, i);
}

module.exports = function () {
  var options = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var delay = options.delay || APP_INIT_TIME;
  if (options.terminate === undefined) {
    options.terminate = true;
  }
  Promise.delay(delay).then(function () {
    var usedFiles = [];

    function iterateModule(currentModule) {
      // console.log(`\nModule: ${currentModule.filename}, children:\n${currentModule.children.map(child => child.filename).join('\n')}`);
      currentModule.children.forEach(function (child) {
        if (usedFiles.indexOf(child.filename) === -1 && isModule(child.filename)) {
          usedFiles.push(child.filename);
          iterateModule(child);
        }
      });
    }

    iterateModule(module.parent.parent);

    if (usedFiles.length === 0) {
      throw new Error('No module files found!');
    }

    var shortestPath = options.path;
    if (!shortestPath) {
      shortestPath = sharedStart(usedFiles);
      while (!fs.lstatSync(shortestPath).isDirectory() && shortestPath.length > 0) {
        shortestPath = shortestPath.substr(0, shortestPath.length - 1);
      }
    }
    if (!shortestPath) {
      throw new Error('Failed to get common directory!');
    }

    var allFiles = [];
    return new Promise(function (resolve) {
      klaw(shortestPath).on('data', function (item) {
        if (isModule(item.path) && !item.stats.isDirectory()) {
          allFiles.push(item.path);
        }
      }).on('end', function () {
        return resolve({ shortestPath: shortestPath, allFiles: allFiles, usedFiles: usedFiles });
      });
    });
  }).then(function (_ref) {
    var shortestPath = _ref.shortestPath,
        allFiles = _ref.allFiles,
        usedFiles = _ref.usedFiles;

    var log = [];
    log.push('\n\n===============DEADC0DE===============');
    log.push('iterated modules from: ' + module.parent.parent.filename);
    log.push('min path: ' + shortestPath);
    log.push('Short report: ' + usedFiles.length + ' files from ' + allFiles.length + ' are really used');
    log.push('\n\nAll files (' + allFiles.length + '):\n' + allFiles.sort().join('\n'));
    log.push('\n\nUsed files (' + usedFiles.length + '):\n' + usedFiles.sort().join('\n'));
    var nonUsed = allFiles.filter(function (el) {
      return usedFiles.indexOf(el) === -1;
    });
    log.push('\n\nNon Used files (' + nonUsed.length + '):\n' + nonUsed.sort().join('\n'));
    log.push('===============DEADC0DE===============\n\n');
    var logPromise = void 0;
    if (options.reportDir) {
      var logFileName = path.join(options.reportDir, '/', 'report.' + uuid() + '.' + module.parent.parent.filename.replace(new RegExp('/', 'g'), '_') + '.log');
      logPromise = Promise.promisify(fs.writeFile)(logFileName, log.join('\n'));
    } else {
      console.log(log.join('\n'));
      logPromise = Promise.resolve();
    }
    return logPromise;
  }).then(function () {
    if (!options.terminate) {
      return;
    }
    process.exit(0);
  }).catch(function (err) {
    console.log('\n\n===============DEADC0DE===============\n\n' + err + '\n\n===============DEADC0DE===============\n\n');
    if (options.terminate) {
      process.exit(1);
    }
  });
};