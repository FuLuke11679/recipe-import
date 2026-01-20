const path = require("path");

module.exports = {
  watchFolders: [path.resolve(__dirname, "..", "..", "packages")],
  resolver: {
    nodeModulesPaths: [path.resolve(__dirname, "node_modules"), path.resolve(__dirname, "..", "..", "packages")],
  },
};
