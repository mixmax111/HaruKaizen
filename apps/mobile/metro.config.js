const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Trova la root del progetto mobile e la root del monorepo
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Monitora tutte le modifiche ai file all'interno dell'intero monorepo preservando i default di Expo
config.watchFolders = Array.from(new Set([...(config.watchFolders || []), projectRoot, monorepoRoot]));

// 2. Consente a Metro di risolvere i pacchetti sia in apps/mobile/node_modules sia alla radice
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// 3. Blocca la risoluzione di react-native e react fuori dalla versione certificata in apps/mobile
config.resolver.extraNodeModules = {
  'react-native': path.resolve(projectRoot, 'node_modules/react-native'),
  'react': path.resolve(projectRoot, 'node_modules/react'),
};

module.exports = config;

