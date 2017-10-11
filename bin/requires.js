/* eslint-disable no-cond-assign */

'use strict';

const fs = require('fs');
const Promise = require('bluebird');
const klaw = require('klaw');
const path = require('path');
const argv = require('minimist')(process.argv.slice(2));

const {
  dir,
  file,
  nodePath,
  nodeModules,
  reportDir,
} = argv;
const verbose = (argv.verbose !== undefined);

if (!dir) {
  throw new Error('Please provide directory!');
}
if (!reportDir) {
  throw new Error('Please provide report directory!');
}

if (!nodeModules) {
  throw new Error('Please provide nodeModules directory!');
}

if (!fs.lstatSync(dir).isDirectory()) {
  throw new Error(`${dir} is not a directory!`);
}

let nodePathes = [];
if (nodePath) {
  nodePathes = nodePath.split(',');
}

function moduleExists(name) {
  try {
    return require.resolve(name);
  }
  catch (e) {
    return false;
  }
}

function isModule(filename) {
  const filenameLower = filename.toLowerCase();
  return (
    (filenameLower.indexOf('/node_modules/') === -1) &&
    (filenameLower.indexOf('/test/') === -1) &&
    (filenameLower.indexOf('module.json') === -1) &&
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

function getFileRequires(filename) {
  if (verbose) {
    console.log(`processing file ${filename}`);
  }
  // todo: rewrite using require priority
  const contents = fs.readFileSync(filename);
  const required = [];
  const regex = /require\('(.*?)'\)/ig;
  let match;
  while (match = regex.exec(contents)) {
    required.push(match[1]);
  }
  if (verbose) {
    console.log(`\n\nFound requires:\n${required.join('\n')}`);
  }
  const localRequires = required.filter((item) => {
    // console.log(`Joining ${nodeModules} and ${item}`);
    const modulePath = path.join(nodeModules, '/', item);
    return !(moduleExists(item) || fs.existsSync(modulePath) && fs.lstatSync(modulePath).isDirectory());
  });

  if (localRequires.length === 0) {
    if (verbose) {
      console.log('no local requires');
    }
    return [];
  }
  if (verbose) {
    console.log(`\n\nLocal requires:\n${localRequires.join('\n')}`);
  }

  const possibleModules = localRequires.reduce((result, item) => {
    if (item[0] === '.') {
      const localName = path.join(filename, '../', item);
      return result.concat(`${localName}/index.js`, `${localName}.js`);
    }
    const variants = nodePathes.map(somePath => path.join(somePath, item));
    const pathes = variants.concat(path.join(nodeModules, item));
    const pathVariants = pathes.reduce((result2, item2) => {
      result2.push(`${item2}.js`);
      result2.push(`${item2}/index.js`);
      return result2;
    }, []);
    return result.concat(pathVariants);
  }, []);
  if (verbose) {
    console.log(`\n\nPossible  modules:\n${possibleModules.join('\n')}`);
  }

  const realModules = possibleModules.filter(item => fs.existsSync(item));
  if (verbose) {
    console.log(`\n\nReal  modules:\n${realModules.join('\n')}`);
  }
  return realModules;
}

if (!file) {
  throw new Error('Please provide starting file!');
}

const usedFiles = file.split(',');

function buildRequires(filename) {
  const children = getFileRequires(filename);
  if (children.length) {
    children.forEach((child) => {
      if (usedFiles.indexOf(child) === -1) {
        usedFiles.push(child);
        buildRequires(child);
      }
    });
  }
}

file.split(',').forEach(file1 => buildRequires(file1));
console.log(`\n\nRequired files:\n ${usedFiles.length}`);


const allFiles = [];
return new Promise((resolve) => {
  klaw(dir)
    .on('data', (item) => {
      if (isModule(item.path) && !item.stats.isDirectory()) {
        allFiles.push(item.path);
      }
    })
    .on('end', () => resolve());
}).then(() => {
  const nonUsedFiles = allFiles.filter(el => usedFiles.indexOf(el) === -1);

  const logFileName = path.join(reportDir, '/', 'report.static.json');
  const shortReport = `Short report: ${usedFiles.length} files from ${allFiles.length} are really used`;
  console.log(shortReport);
  const log = {
    minPath: dir,
    shortReport,
    usedFiles,
    allFiles,
    nonUsedFiles,
  };
  return Promise.promisify(fs.writeFile)(logFileName, JSON.stringify(log, null, 3));
})
  .then(() => {
    console.log('Wrote report file, all ok');
    process.exit(0);
  })
  .catch((err) => {
    console.log(`\n\nFAIL: ${err.message}`);
    process.exit(0);
  });
