const fs = require('fs');
const browserify = require('browserify');
const {
    minify
} = require("terser");
const npm = require("npm");
const {
    Readable
} = require("stream");
const {
    NpmInstallOutput,
    PackageMetadata
} = require('./models');
const path = require('path');

const npmLoadOptions = {
    loglevel: "silent",
    save: false,
    json: true
};

function npmLoadAsync(onLoadCallback) {
    npm.load(npmLoadOptions, function onLoaded(err) {
        if (err) throw err;
        if (onLoadCallback[Symbol.toStringTag] === 'AsyncFunction')
            onLoadCallback().then(result => {
                return result;
            });
        else
            return onLoadCallback();
    });
}

npmLoadAsync(() => {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    rl.question('Provide the packages you want to browserify (delimited by \';\') :\n', (packages) => {
        if (!packages) console.error('Invalid input.');
        else {
            const npmPackageList = packages.split(';');
            commenceInstall(npmPackageList).then(function (results) {
                results.forEach(result => {
                    if (result)
                        console.log(result);
                });
                if (packages.length == results.length)
                    console.log('All package(s) successfully converted');
                else
                    console.log(`Successfully converted ${results.length} packages`);
            }).catch(reason => {
                console.error(reason)
            }).finally(() => {
                console.log('Done');
            });
        }
        rl.close();
    });
});

async function commenceInstall(npmPackageList) {
    if (!npmPackageList || npmPackageList.length == 0) {
        console.error('No packages specified.');
        return 1;
    }
    let packagePromises = new Array();
    for (const package of npmPackageList) {
        const packageDetail = await installPackage(package);
        let input = `const _package_ = require('${packageDetail.name}');window['${packageDetail.name}']=_package_;`;
        const inputStream = Readable.from([input]);
        packagePromises.push(convert(inputStream, packageDetail.name));
    }
    return new Promise((resolve, reject) => {
        Promise.all(packagePromises).catch(function rejected(reason) {
            reject(reason);
        }).then(function fulfilled(results) {
            resolve(results);
        });
    });
}

async function getLatestVersionOf(packageName) {
    return new Promise((resolve, reject) => {
        console.log(`Trying to get the latest version of ${packageName}`);
        npm.commands.show([packageName], function (err, result) {
            if (err) reject(err);
            let latestVersion = result[Object.keys(result)[0]]["dist-tags"].latest;
            resolve(latestVersion);
        });
    });
}

//Installs the package and returns the installed version (if successful), else throw error.
async function installPackage(packageName) {
    console.log(`Trying to install package ${packageName}`);
    if (!packageName) reject('Invalid package name');
    const latestVersion = await getLatestVersionOf(packageName);
    console.log(`Latest version is : ${latestVersion}`);

    const {
        installedVersion,
        installationPath
    } = await retrieveInstalledPackageVersion(packageName);
    if (installedVersion)
        console.log(`Installed version is : ${installedVersion}`);
    return new Promise((resolve, reject) => {
        function npmInstall(packageName) {
            npm.load({
                save: false,
                json: false
            }, function onLoaded(err) {
                if (err) throw err;
                npm.commands.install([packageName], function (err, installedPackages) {
                    if (err) throw err;
                    if (installedPackages.length == 0)
                        reject("Unable to install package");
                    else {
                        installedPackages.forEach(installedPackage => {
                            let temp = installedPackage[0].split('@');
                            if (temp[0].toUpperCase() == packageName.toUpperCase()) {
                                resolve(new PackageMetadata('add', temp[0], temp[1], installedPackage[1]));
                            }

                        });
                        reject('Unable to find the requested package among installed packages! Totally weird!');
                    }
                });
            });
        }
        if (!installedVersion) {
            console.log('Package hasn\'t been installed yet. Installing it.');
            npmInstall(packageName);
        } else if (installedVersion === latestVersion) {
            console.log(`Installed version is same as latest version from repo; ${latestVersion}. Skipping installation`);
            resolve(new PackageMetadata('add', packageName, installedVersion, installationPath))
        } else {
            console.log(`Installed version is different from latest version. Reinstalling`);
            npmInstall(packageName);
        }
    });


}

async function retrieveModuleInstallationPath() {
    return new Promise((resolve, reject) => {
        console.log(`Trying to retrieve node_modules path for current project`);
        npm.commands.root([], function (err, result) {
            if (err) reject(err);
            console.log(`node_modules path : ${result}`);
            resolve(result);
        });
    });
}

async function retrieveInstalledPackageVersion(packageName) {
    console.log(`Trying to get the installed version of ${packageName}`);
    const nodeModulesPath = await retrieveModuleInstallationPath();
    return new Promise((resolve, reject) => {
        let absolutePathToPackage = path.join(nodeModulesPath, packageName, 'package.json');
        fs.readFile(absolutePathToPackage, function (err, data) {
            if (err) {
                console.log('Package is not installed');
                resolve({
                    installedVersion: null,
                    installationPath: null
                });
            } else {
                let packageDetail = JSON.parse(data);
                resolve({
                    installedVersion: packageDetail.version,
                    installationPath: absolutePathToPackage
                });
            }
        });
    });
}

function convert(inputStream, outputFileName) {
    return new Promise((resolve, reject) => {
        let outputStream = fs.createWriteStream(`./dist/${outputFileName}.js`);
        browserify()
            .add(inputStream)
            .bundle()
            .on('error', function (error) {
                reject(error);
            })
            .pipe(outputStream).on('finish', function () {
                outputStream.close();

                console.log('Converted to browser js. Trying to minify it');
                fs.readFile(`./dist/${outputFileName}.js`, function (err, data) {
                    if (err) throw err;
                    let browserifiedCode = data.toString();
                    console.log('Before minification :' + browserifiedCode.length + ' bytes');

                    const options = {
                        compress: {
                            passes: 2
                        },
                        sourceMap: true,
                    };
                    minify(browserifiedCode, options).then(result => {
                        fs.writeFile(`./dist/${outputFileName}.min.js`, result.code, function (err) {
                            if (err) throw err;
                            console.log('After minification :' + result.code.length + ' bytes');

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