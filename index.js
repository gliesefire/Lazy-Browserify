const fs = require('fs');
const browserify = require('browserify');
const {
    minify
} = require("terser");
const npm = require("npm");
const {
    Readable
} = require("stream");

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Provide the packages you want to browserify (delimited by \';\') :\n', (packages) => {
    commenceInstall(packages);
    rl.close();
});

function commenceInstall(packages){
    const npmPackageList = packages.split(';');
    if (!npmPackageList || npmPackageList.length == 0) {
        console.error('No packages specified.');
        return 1;
    }
    let packagePromises = new Array();
    npmPackageList.forEach(package => {
        npm.load({
            loaded: false,
            silent: true,
            save: false,
        }, function (err) {
            // catch errors
            npm.commands.install([package], function (err, installedPackages) {
                if (err) throw err;
                if(installedPackages.length == 0)
                    console.warn("No packages were installed.");
                else{
                    installedPackages.forEach(installedPackage => {
                        let basePackageName = installedPackage[0].split('@')[0];
                        let outputFileName = installedPackage[0].replace('@', '_');
                        let input = `const _package_ = require('${basePackageName}');window['${basePackageName}']=_package_;`;
                        const inputStream = Readable.from([input]);
                        packagePromises.push(convert(inputStream, outputFileName));
                    });
                }
            });
            npm.on("log", function (message) {
                console.log(message);
            });
        });
    });

    Promise.all(packagePromises).catch(function rejected(reason) {
        console.error(reason);
    }).then(function fulfilled(results) {
        results.forEach(result => {
            if (result)
                console.log(result);
        })
    });
}

function convert(inputStream, outputFileName) {
    return new Promise(function (resolve, reject) {
        let outputStream = fs.createWriteStream(`./dist/${outputFileName}.js`);
        browserify()
            .add(inputStream)
            .bundle()
            .on('error', function (error) {
                reject(error);
            })
            .pipe(outputStream).on('finish', function () {
                outputStream.close();

                console.log('\n\nConverted to browser js. Trying to minify it');
                fs.readFile(`./dist/${outputFileName}.js`, function (err, data) {
                    if (err) throw err;
                    let browserifiedCode = data.toString();
                    console.log('\n\nBefore transformation :' + browserifiedCode.length + ' bytes');

                    const options = {
                        compress :{
                            passes: 2
                        },
                        sourceMap: true,
                    };
                    minify(browserifiedCode, options).then(function done(result) {
                        fs.writeFile(`./dist/${outputFileName}.min.js`, result.code, function (err) {
                            if (err) throw err;
                            console.log('\n\nAfter transformation :' + result.code.length + ' bytes');

                            if (result.map)
                                fs.writeFile(`./dist/${outputFileName}.min.js.map`, result.map, function (err) {
                                    if (err) throw err;
                                    resolve();
                                });
                            else
                                resolve();
                        });
                    }, function failed(error) {
                        reject(error);
                    });
                });
            });
    });
}