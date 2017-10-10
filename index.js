const klaw = require('klaw');
const Promise = require('bluebird');
const path = require('path');

const APP_INIT_TIME = 5000;

function isModule(filename) {
    return (
        (filename.indexOf('/node_modules/') === -1) &&
        (filename.indexOf('/test/') === -1) &&
        (filename.indexOf('/.git/') === -1) &&
        (path.basename(filename) !== 'package.json') &&
        (path.basename(filename) !== 'package-lock.json') &&
        (path.extname(filename) === '.js' || path.extname(filename) === '.json')
    );
}

module.exports = (options = {}) => {
    const delay = options.delay || APP_INIT_TIME;
    Promise.delay(delay)
        .then(() => {
            const usedFiles = [];

            function iterateModule(currentModule) {
                currentModule.children.forEach((child) => {
                    if (usedFiles.indexOf(child.filename) === -1 && isModule(child.filename)) {
                        usedFiles.push(child.filename);
                        iterateModule(child);
                    }
                })
            }

            iterateModule(module.parent);

            if (!usedFiles) {
                throw new Error('No module files found!');
            }

            let shortestPath = options.path;
            if (!shortestPath) {
                shortestPath = usedFiles.reduce((result, item) => {
                    if (item.length < result.length) {
                        return item;
                    }
                    return result;
                });
                shortestPath = shortestPath.substr(0, shortestPath.lastIndexOf('/'));
            }


            const allFiles = [];
            return new Promise((resolve) => {
                klaw(shortestPath)
                    .on('data', (item) => {
                        if (isModule(item.path) && !item.stats.isDirectory()) {
                            allFiles.push(item.path)
                        }
                    })
                    .on('end', () => resolve({shortestPath, allFiles, usedFiles}));
            });
        })
        .then(({shortestPath, allFiles, usedFiles}) => {
            const log = [];
            log.push('\n\n===============DEADC0DE===============');
            log.push(`min path: ${shortestPath}`);
            log.push(`\nAll files:\n${allFiles.join('\n')}`);
            log.push(`\nUsed files:\n${usedFiles.join('\n')}`);
            const nonUsed = allFiles.filter((el) => usedFiles.indexOf(el) === -1);
            log.push(`\nNon Used files:\n${nonUsed.join('\n')}`);
            log.push('===============DEADC0DE===============\n\n');
            console.log(log.join('\n'));
            if (nonUsed.length > 0) {
                process.exit(1);
            }
            process.exit(0);
        })
        .catch((err) => {
            console.log(err);
            process.exit(1);
        });
};
