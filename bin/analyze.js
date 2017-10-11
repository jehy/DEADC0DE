'use strict';

const fs = require('fs');
const Promise = require('bluebird');
const klaw = require('klaw');
const path = require('path');

const argv = require('minimist')(process.argv.slice(2));

const {dir} = argv;

if (!fs.lstatSync(dir).isDirectory()) {
  throw new Error(`${dir} is not a directory!`);
}
const files = [];

return new Promise((resolve) => {
  klaw(dir)
    .on('data', (item) => {
      if (!item.stats.isDirectory() && (item.path.indexOf('.json') !== -1)) {
        files.push(item.path);
      }
    })
    .on('end', () => resolve());
}).then(() => {
  Promise.all(files.map(file => Promise.promisify(fs.readFile)(file)))
    .then((data) => {
      const allUnused = data
        .map(item => JSON.parse(item))
        .map(item => item.nonUsedFiles)
        .reduce((result, item) => result.concat(item), []);
      const logNum = data.length;
      console.log(`Analyzing ${logNum} files with ${allUnused.length} non found entries:\n\n${files.join(',\n')}`);
      const notFound = allUnused.filter((item, index) => {
        if (allUnused.indexOf(item) !== index) {
          return false;
        }
        let count = 0;
        for (let i = 0; i < allUnused.length; i++) {
          if (allUnused[i] === item) {
            count++;
          }
        }
        return count === logNum;
      });
      console.log(`Found ${notFound.length} files not required in any of files`);
      return Promise.promisify(fs.writeFile)(path.join(dir, '/', 'analyzed.log'), notFound.sort().join('\n'));
    })
    .then(() => {
      console.log('\n\nJob`s done!');
      process.exit(0);
    })
    .catch((err) => {
      console.log(`\n\nFAIL: ${err.message}`);
      process.exit(0);
    });
});
