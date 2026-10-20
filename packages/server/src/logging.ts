export type RequestLog = {
	event: "request" | "api_error" | "chat_failed" | "realtime_error";
	requestId: string;
	method: string;
	route: string;
	status?: number;
	durationMs?: number;
	userId?: string;
	workspaceId?: string;
	errorType?: string;
	stack?: string[];
};
export type LogSink = (record: RequestLog) => void;
export const writeLog: LogSink = (record) => {
	process.stdout.write(JSON.stringify(record) + "\n");
};
// Exception messages and causes may contain user input or credentials. Only retain source locations.
export function safeError(error: unknown, development: boolean) {
	return {
		errorType:
			error instanceof SyntaxError
				? "SyntaxError"
				: error instanceof TypeError
					? "TypeError"
					: "Error",
		...(development && error instanceof Error
			? {
					stack: (error.stack ?? "")
						.split("\n")
						.slice(1)
						.flatMap((line) => {
							const match = /[/\\]([\w.-]+\.[cm]?[jt]sx?):(\d+):(\d+)\)?$/.exec(line.trim());
							return match ? [`${match[1]}:${match[2]}:${match[3]}`] : [];
						})
						.slice(0, 8),
				}
			: {}),
	};
}
