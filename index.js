const fs = require('fs');
const tsify = require('tsify');
const browserify = require('browserify');
const babel = require("@babel/core");
const npm = require("npm");
const {
    Readable
} = require("stream")

const prompt = require('prompt');
prompt.start();

prompt.get(['packages'], function (err, result) {
    if (err) {
        return onErr(err);
    }
    const npmPackageList = result.packages.split(' ');
    if (!npmPackageList || npmPackageList.length == 0) {
        console.error('No packages specified.');
        return 1;
    }
    let packagePromises = new Array();
    npmPackageList.forEach(package => {
        npm.load({
            loaded: false,
            silent: true,
            save : false,
        }, function (err) {
            // catch errors
            npm.commands.install([package], function (err, data) {
                if (err) throw err;
                let basePackageName = package.split('@')[0];
                let input = `const _package_ = require('${basePackageName}');window['${basePackageName}']=_package_;`;
                const inputStream = Readable.from([input]);
                packagePromises.push(convert(inputStream, basePackageName));
            });
            npm.on("log", function (message) {
                // log the progress of the installation
                console.log(message);
            });
        });
    });

    Promise.all(packagePromises).catch(function rejected(reason) {
        console.error(reason);
    }).then(function fulfilled(results) {
        results.forEach(result => {
            if(result)
                console.log(result);
        })
    });
});

function onErr(err) {
    console.log(err);
    return 1;
}

function convert(inputStream, basePackageName) {
    return new Promise(function (resolve, reject) {
        let outputStream = fs.createWriteStream(`./dist/${basePackageName}-build.js`);
        browserify()
            .add(inputStream)
            .plugin(tsify, {
                noImplicitAny: true
            })
            .bundle()
            .on('error', function (error) {
                reject(error);
            })
            .pipe(outputStream).on('finish', function () {
                outputStream.close();

                console.log('\n\nConverted to browser js. Trying to minify it');
                fs.readFile(`./dist/${basePackageName}-build.js`, function (err, data) {
                    if (err) throw err;
                    let browserifiedCode = data.toString();
                    console.log('\n\nBefore transformation :' + browserifiedCode.length + ' bytes');
                    babel.transform(browserifiedCode, function onTransform(err, transpiledCode) {
                        if (err || !transpiledCode.code) throw err;
                        fs.writeFile(`./dist/${basePackageName}-build.min.js`, transpiledCode.code, function (err) {
                            if (err) throw err;
                            console.log('\n\nAfter transformation :' + transpiledCode.code.length+ ' bytes');
                            resolve();
                        });
                    });
                });
            });
    });
}