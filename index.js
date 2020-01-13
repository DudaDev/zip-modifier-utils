const FileZipModifier = require("@dudadev/s3-zip-modifier/file");
const chokidar = require("chokidar");
const express = require("express");
const staticZip = require("express-static-zip");


/**
 * 
 * @param {*} param0 
 */
async function serveZips({
  zipFile,
  port,
  modifiedPort,
  zipRoot,
  modifiers
}) {
  // serve original file
  server.serve(zipFile, port, zipRoot);
  // create zip modifier
  const fileModifier = new FileZipModifier({ verbose: "minimal" });
  // load the zip file
  await fileModifier.loadZip({ path: zipFile });
  // run modifiers
  await modifiers(fileModifier.zipModifier);
  // save zip
  const { path: newZipPath } = await fileModifier.saveZip();
  // serve modified file
  server.serve(newZipPath, modifiedPort, zipRoot);
}

/**
 * Server class - to serve a zip file
 */
class Server {
  constructor() {
    this.ports = {};
  }
  serve(zipFile, port, zipRoot) {
    if (this.ports[port]) {
      this.ports[port].close();
    }
    const app = express();
    app.get("/", (req, res) => res.send(`Serving ${zipFile}`));
    app.use(staticZip(`./${zipFile}`, { zipRoot }));
    console.log(`serving ${zipFile} on http://localhost:${port}/`);
    this.ports[port] = app.listen(port);
  }
}
const server = new Server();

/**
 * helper function - for debouncing
 * @param {function} func the function to run
 * @param {number} wait ms
 */
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

/**
 * watch a path and run a function
 * @param {string} path the path to watch
 * @param {function} fn the function to run if the path changes
 */
function watch(path, fn, { timeout = 2000, event = "change" } = {}) {
  chokidar.watch(path).on(event, debounce(fn, timeout));
}

/**
 * run a function, then watch a path and re-run a function
 * @param {string} path the path to watch
 * @param {function} fn the function to run if the path changes
 */
function runAndWatch(path, fn, options) {
  fn();
  return watch(path, fn, options);
}

/**
 * clear the require cache of node (for re-running)
 * @param {function} predicate the paths to clear
 */
function clearCache(predicate) {
    // clean cache if needed
    const cache = Object.keys(require.cache).filter(predicate);
    if (cache.length) {
      console.log("cleaning cache");
      cache.forEach(id => delete require.cache[id]);
    }
}

module.exports = {
  server,
  Server,
  watch,
  runAndWatch,
  clearCache,
  serveZips
};
