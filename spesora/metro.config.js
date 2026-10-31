// Configurazione Metro: aggiunge il supporto .wasm richiesto da expo-sqlite sul web
// (usato solo per anteprime di sviluppo; l'app di destinazione è iOS).
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('wasm');
module.exports = config;
