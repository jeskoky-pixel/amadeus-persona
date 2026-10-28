/**
 * Single-process focused test entry point.
 *
 * The DSH sandbox denies the piped child-process spawn that `node --test`
 * uses to isolate test files, so this runner imports the same `node:test`
 * suites in one process.  Each suite uses its own temporary directory.
 */

import './store.test.js';
import './resolver.test.js';
import './http.test.js';
import './console.test.js';
import './assembly.test.js';
