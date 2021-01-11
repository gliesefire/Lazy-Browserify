# Lazy-Browserify
A Wrapper around browserify and terser (to minify) npm packages.

[index.js](index.js) is the entry file. Run the script, provide the npm packages you wish to browserify, delimited by semicolon `;`. <br>
Package source can be any of the sources accepted by [`npm install`](https://docs.npmjs.com/cli/v6/commands/npm-install).

**Note**: If it is a clean installation, all the dependant packages will also be browserified.