// These assertions fail if a dependency leaks server globals into the browser program.
// @ts-expect-error Bun is deliberately unavailable to browser code.
export type BrowserMustNotSeeBun = typeof Bun;
// @ts-expect-error process is deliberately unavailable to browser code.
export type BrowserMustNotSeeProcess = typeof process;
