import { expect, test } from "bun:test";
import { allowedOrigin } from "../src/realtime";

const request = (headers: Record<string, string>) =>
	new Request("http://127.0.0.1:3001/api/realtime", { headers });

test("live updates accept listed origins, or the API's own host when it serves the app", () => {
	const listed = { origins: ["http://127.0.0.1:5173"], sameOrigin: false };
	expect(allowedOrigin(request({ origin: "http://127.0.0.1:5173" }), listed)).toBe(true);
	// The Vite proxy rewrites Host, so a dev request never matches by host alone.
	expect(
		allowedOrigin(request({ origin: "http://127.0.0.1:3001", host: "127.0.0.1:3001" }), listed),
	).toBe(false);
	expect(allowedOrigin(request({}), listed)).toBe(false);
	const same = { origins: [], sameOrigin: true };
	expect(allowedOrigin(request({ origin: "https://app.test", host: "app.test" }), same)).toBe(true);
	expect(allowedOrigin(request({ origin: "https://evil.test", host: "app.test" }), same)).toBe(
		false,
	);
	expect(allowedOrigin(request({ origin: "null", host: "app.test" }), same)).toBe(false);
});
