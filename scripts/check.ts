const commands = [["lint"], ["typecheck"], ["boundaries"], ["build"]];
const started = performance.now();
const results = await Promise.all(
	commands.map(async ([name]) => {
		if (!name) throw new Error("Missing check name");
		const start = performance.now();
		const proc = Bun.spawn([process.execPath, "run", name], { stdout: "pipe", stderr: "pipe" });
		const [out, err, code] = await Promise.all([
			new Response(proc.stdout).text(),
			new Response(proc.stderr).text(),
			proc.exited,
		]);
		process.stdout.write(
			`\n[${name}] ${code === 0 ? "PASS" : "FAIL"} ${((performance.now() - start) / 1000).toFixed(2)}s\n${out}${err}`,
		);
		return { name, code };
	}),
);
process.stdout.write(`\nTotal: ${((performance.now() - started) / 1000).toFixed(2)}s\n`);
if (results.some((r) => r.code !== 0)) process.exit(1);

export {};
