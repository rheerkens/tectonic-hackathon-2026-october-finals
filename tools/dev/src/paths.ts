import { closeSync, constants, fstatSync, openSync, readFileSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

/** Opens never follow a final symlink; O_NONBLOCK keeps a planted FIFO from hanging the reader. */
export const noFollow = constants.O_NOFOLLOW ?? 0;

/** Resolves `segments` below `base` and throws unless the result stays strictly inside `base`. */
export function containedPath(base: string, ...segments: string[]) {
	const root = resolve(base),
		file = resolve(root, ...segments),
		rel = relative(root, file);
	if (!rel || rel === ".." || rel.startsWith(".." + sep) || isAbsolute(rel))
		throw new Error(`Path escapes ${root}: ${segments.join("/")}`);
	return file;
}

/** Reads regular file `name` inside `dir` without following a symlink; throws for escapes, links, FIFOs and directories. */
export function readRegularFile(dir: string, name: string) {
	const file = containedPath(dir, name);
	const fd = openSync(file, constants.O_RDONLY | constants.O_NONBLOCK | noFollow);
	try {
		if (!fstatSync(fd).isFile()) throw new Error(`Not a regular file: ${file}`);
		return readFileSync(fd, "utf8");
	} finally {
		closeSync(fd);
	}
}
