const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Trova la root del progetto mobile e la root del monorepo
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const sharedPkg = path.resolve(monorepoRoot, 'packages/shared');

const config = getDefaultConfig(projectRoot);

// 1. Monitora solo mobile e packages/shared (NON aggiungere node_modules a watchFolders per evitare scansioni di 100k+ file su Windows)
config.watchFolders = [
  projectRoot,
  sharedPkg,
];

// 2. Blocca la scansione di directory pesanti di altre app e version control
config.resolver.blockList = [
  /.*[/\\]apps[/\\](web|api)[/\\].*/,
  /.*[/\\]\.git[/\\].*/,
  /.*[/\\]\.turbo[/\\].*/,
];

// 3. Consente a Metro di risolvere i pacchetti sia in apps/mobile/node_modules sia alla radice
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 4. Blocca la risoluzione di react-native e react fuori dalla versione certificata in apps/mobile
config.resolver.extraNodeModules = {
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react': path.resolve(projectRoot, 'node_modules/react'),
  'react/jsx-runtime': path.resolve(projectRoot, 'node_modules/react/jsx-runtime'),
  'react/jsx-dev-runtime': path.resolve(projectRoot, 'node_modules/react/jsx-dev-runtime'),
};

module.exports = config;
