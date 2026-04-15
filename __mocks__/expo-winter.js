// Mock for expo/src/winter/* modules
module.exports = {
  ImportMetaRegistry: { url: null },
  installGlobal: () => {},
  TextDecoder: global.TextDecoder,
  TextEncoder: global.TextEncoder,
  URL: global.URL,
  URLSearchParams: global.URLSearchParams,
};
