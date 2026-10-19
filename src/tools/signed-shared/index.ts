/**
 * Shared .p7m (CMS / PKCS#7 SignedData, CAdES-BES) reader for the P7M opener and the FatturaPA
 * viewer. Pure TypeScript on WebCrypto: no DOM, no network, no dependencies.
 */
export { P7mError, innerFileName, isP7m, openP7m } from "./p7m";
export type { OpenedP7m, P7mErrorCode, SignerInfo } from "./p7m";
