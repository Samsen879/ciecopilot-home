// Legacy import path shim.
// Keep a single auth implementation in api/middleware/auth.js.
export * from '../api/middleware/auth.js';
import * as auth from '../api/middleware/auth.js';
export default auth;

