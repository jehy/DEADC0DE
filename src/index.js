'use strict';

const klaw = require('klaw');
const Promise = require('bluebird');
const path = require('path');
const fs = require('fs');
const uuid = require('uuid/v4');
const objectAssignPolyfill = require('object-assign');

if (typeof Object.assign === 'undefined') { // need for library modules
  Object.assign = objectAssignPolyfill;
}
const APP_INIT_TIME = 5000;

function isModule(filename) {
  const filenameLower = filename.toLowerCase();
  return (
    (filenameLower.indexOf('/node_modules/') === -1) &&
    (filenameLower.indexOf('/test/') === -1) &&
    (filenameLower.indexOf('/tests/') === -1) &&
    (filenameLower.indexOf('/bin/') === -1) &&
    (filenameLower.indexOf('/conf/') === -1) &&
    (filenameLower.indexOf('/deadc0de/') === -1) &&
    (filenameLower.indexOf('/.git/') === -1) &&
    (path.basename(filenameLower) !== 'package.json') &&
    (path.basename(filenameLower) !== 'package-lock.json') &&
    (path.extname(filenameLower) === '.js' || path.extname(filenameLower) === '.json')
  );
}

function sharedStart(array) {
  const A = array.concat().sort(),
    a1 = A[0],
    a2 = A[A.length - 1],
    L = a1.length;
  let i = 0;
  while (i < L && a1.charAt(i) === a2.charAt(i)) i++;
  return a1.substring(0, i);
}

module.exports = (options = {}) => {
  const delay = options.delay || APP_INIT_TIME;
  if (options.terminate === undefined) {
    options.terminate = true;
  }
  Promise.delay(delay)
    .then(() => {
      const usedFiles = [];

      function iterateModule(currentModule) {
        // console.log(`\nModule: ${currentModule.filename}, children:\n${currentModule.children.map(child => child.filename).join('\n')}`);
        currentModule.children.forEach((child) => {
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

      let shortestPath = options.path;
      if (!shortestPath) {
        shortestPath = sharedStart(usedFiles);
        while (!fs.lstatSync(shortestPath).isDirectory() && shortestPath.length > 0) {
          shortestPath = shortestPath.substr(0, shortestPath.length - 1);
        }
      }
      if (!shortestPath) {
        throw new Error('Failed to get common directory!');
      }


      const allFiles = [];
      return new Promise((resolve) => {
        klaw(shortestPath)
          .on('data', (item) => {
            if (isModule(item.path) && !item.stats.isDirectory()) {
              allFiles.push(item.path);
            }
          })
          .on('end', () => resolve({shortestPath, allFiles, usedFiles}));
      });
    })
    .then(({shortestPath, allFiles, usedFiles}) => {
      const log = [];
      log.push('\n\n===============DEADC0DE===============');
      log.push(`iterated modules from: ${module.parent.parent.filename}`);
      log.push(`min path: ${shortestPath}`);
      log.push(`Short report: ${usedFiles.length} files from ${allFiles.length} are really used`);
      log.push(`\n\nAll files (${allFiles.length}):\n${allFiles.sort().join('\n')}`);
      log.push(`\n\nUsed files (${usedFiles.length}):\n${usedFiles.sort().join('\n')}`);
      const nonUsed = allFiles.filter(el => usedFiles.indexOf(el) === -1);
      log.push(`\n\nNon Used files (${nonUsed.length}):\n${nonUsed.sort().join('\n')}`);
      log.push('===============DEADC0DE===============\n\n');
      let logPromise;
      if (options.reportDir) {
        const logFileName = path.join(options.reportDir, '/',
          `report.${uuid()}.${module.parent.parent.filename.replace(new RegExp('/', 'g'), '_')}.log`);
        logPromise = Promise.promisify(fs.writeFile)(logFileName, log.join('\n'));
      }
      else {
        console.log(log.join('\n'));
        logPromise = Promise.resolve();
      }
      return logPromise;
    })
    .then(() => {
      if (!options.terminate) {
        return;
      }
      process.exit(0);
    })
    .catch((err) => {
      console.log(`\n\n===============DEADC0DE===============\n\n${err}\n\n===============DEADC0DE===============\n\n`);
      if (options.terminate) {
        process.exit(1);
      }
    });
};
