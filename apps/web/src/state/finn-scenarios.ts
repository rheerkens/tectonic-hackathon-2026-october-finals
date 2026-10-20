/**
 * Hard-coded demo scenarios, adapted from scenarios D1 and D2 of the semi-final project
 * (Tectonic-hackathon2026 docs/demo-scenarios.md, seed sources S1–S34).
 * Shape follows the FinnResult proposal in README.md; `supports` and `note` add the "why not?" per source.
 */

export type FinnSource = {
	code: string;
	kind: "teams" | "mail" | "crm" | "doc";
	title: string;
	author: string;
	date: string;
	excerpt: string;
	/** True when this source backs the answer; false sources are shown but rejected. */
	supports: boolean;
	note: string;
};

export type FinnNextStep =
	| { kind: "none" }
	| { kind: "clarify"; question: string }
	| { kind: "contact_person"; person: string; message: string; threadId: string };

export type FinnResult = {
	id: string;
	question: string;
	context: { country: "BE" | "NL"; client: string | null; period: string };
	/** The answer in a few words, shown large on the result page. */
	headline: string | null;
	answer: string | null;
	trust: { score: number; reasons: string[] };
	/** Tool calls the scripted agent replays, in order, while FINN is thinking. */
	steps: Array<{ tool: string; summary: string }>;
	sources: FinnSource[];
	people: Array<{ name: string; role: string; why: string }>;
	nextStep: FinnNextStep;
};

const roy = {
	name: "Roy",
	role: "Account owner, Atlas",
	why: "Owns and approved the Atlas payroll agreements",
};

// D1: the client exception beats the general rule; seven other sources are visible but rejected.
const loonmutatieSources: FinnSource[] = [
	{
		code: "S4",
		kind: "crm",
		title: "Client agreement Atlas",
		author: "Roy",
		date: "2026-09-28",
		excerpt: "Atlas may submit payroll changes up to and including 22 October 2026.",
		supports: true,
		note: "Approved client exception, valid in October 2026",
	},
	{
		code: "S1",
		kind: "doc",
		title: "General procedure Belgium (v5)",
		author: "Sebastian",
		date: "2026-10-01",
		excerpt: "Payroll changes must be in by the 20th of the month.",
		supports: false,
		note: "General rule: the approved Atlas exception goes first",
	},
	{
		code: "S9",
		kind: "mail",
		title: "Mail thread Atlas: request and record",
		author: "Roy",
		date: "2026-09-28",
		excerpt:
			"Roy to Lotte and Wanne: the agreed arrangement is registered as S4. Lotte asks for separate planning for November.",
		supports: false,
		note: "Not confirmed: the mail points to S4, it is not an approval itself",
	},
	{
		code: "S10",
		kind: "teams",
		title: "Atlas meeting: options and open actions",
		author: "Roy",
		date: "2026-09-25",
		excerpt:
			"Planning mentions 23 October as a possible extra day and puts a question mark on the board. No decision was taken.",
		supports: false,
		note: "Not confirmed: 23 October was a proposal",
	},
	{
		code: "S11",
		kind: "teams",
		title: "Teams Atlas: reminder and correction",
		author: "Planning",
		date: "2026-09-29",
		excerpt: "Planning: I remember the 23rd from the board. Roy: the decision is in S4.",
		supports: false,
		note: "Not confirmed: a reminder is not a new agreement",
	},
	{
		code: "S3",
		kind: "teams",
		title: "Teams chat",
		author: "Unknown",
		date: "2026-10-05",
		excerpt: "I thought Atlas could submit until the 25th this time?",
		supports: false,
		note: "Not confirmed: a question in chat, no owner",
	},
	{
		code: "S2",
		kind: "doc",
		title: "Old procedure Belgium (v3)",
		author: "Sebastian",
		date: "2024-01-01",
		excerpt: "Submissions are possible until the 15th of the month.",
		supports: false,
		note: "Superseded by S1",
	},
	{
		code: "S5",
		kind: "doc",
		title: "Procedure Netherlands",
		author: "Sebastian",
		date: "2026-10-01",
		excerpt: "Dutch clients submit payroll changes until the 18th.",
		supports: false,
		note: "Other country (NL)",
	},
];

const d1October: FinnResult = {
	id: "d1-payroll-changes",
	question: "Until when can Atlas submit payroll changes?",
	context: { country: "BE", client: "Atlas", period: "2026-10" },
	headline: "22 October 2026",
	answer:
		"Atlas can submit payroll changes until **22 October 2026** [S4]. This approved client exception replaces the general deadline of 20 October [S1] for October only.",
	trust: {
		score: 0.92,
		reasons: [
			"Approved client agreement by the account owner (Roy)",
			"Valid for Belgium, Atlas and October 2026",
			"The 23rd and 25th in mail and Teams are proposals, not approvals",
			"The older 15th deadline is superseded",
		],
	},
	steps: [
		{
			tool: "search_sources",
			summary: "8 sources on payroll changes in Teams, mail, CRM and procedures",
		},
		{ tool: "assess_trust", summary: "Belgium · Atlas · October 2026" },
		{ tool: "get_source", summary: "S4 Client agreement Atlas" },
	],
	sources: loonmutatieSources,
	people: [roy],
	nextStep: { kind: "none" },
};

// D1 follow-up: every October source expires, so FINN abstains and asks Roy instead of reusing 22 October.
const d1November: FinnResult = {
	id: "d1-payroll-changes-november",
	question: "And for next month?",
	context: { country: "BE", client: "Atlas", period: "2026-11" },
	headline: null,
	answer: null,
	trust: {
		score: 0.15,
		reasons: [
			"No approved source is valid for November 2026",
			"The October exception (S4) and general rule (S1) expire on 31 October",
			"Roy said in Teams that no approved document exists for November yet",
		],
	},
	steps: [
		{ tool: "search_sources", summary: "Same topic, period November 2026" },
		{ tool: "assess_trust", summary: "Belgium · Atlas · November 2026: nothing applies" },
		{ tool: "find_people", summary: "Roy owns the Atlas agreements" },
		{ tool: "contact_person", summary: "Teams message to Roy" },
	],
	sources: loonmutatieSources.map((source) =>
		source.code === "S11"
			? {
					...source,
					excerpt:
						"Lotte: does this also apply to November? Roy: no approved document is available for that yet.",
					note: "Confirms the gap: November is still open",
				}
			: {
					...source,
					supports: false,
					note: ["S2", "S5", "S3"].includes(source.code)
						? source.note
						: "Only valid in October 2026",
				},
	),
	people: [roy],
	nextStep: {
		kind: "contact_person",
		person: "Roy",
		message:
			"Hi Roy, until when can Atlas submit payroll changes for November 2026? I only found the October exception (22 October, S4). Lotte asked the same in Teams on 29 September.",
		threadId: "thread-atlas-november",
	},
};

// D2: three different deadlines on screen; only the current Belgian procedure counts.
const d2: FinnResult = {
	id: "d2-sick-leave",
	question: "Within what time must a sick leave notice be passed on?",
	context: { country: "BE", client: "Atlas", period: "2026-10" },
	headline: "Within 24 hours",
	answer:
		"Pass on a sick leave notice **within 24 hours** of the first day of illness [S6]. I found no confirmed separate agreement for Atlas: the 48 hours in Teams [S7] is not approved, so don't use it.",
	trust: {
		score: 0.85,
		reasons: [
			"Current approved Belgian procedure (v4) by Roy",
			"48 hours comes from one unconfirmed Teams message",
			"72 hours is an older version that expired in 2025",
			"No confirmed Atlas-specific agreement exists",
		],
	},
	steps: [
		{ tool: "search_sources", summary: "4 sources on sick leave notices" },
		{ tool: "assess_trust", summary: "Belgium · Atlas · October 2026" },
		{ tool: "get_source", summary: "S6 Sick leave procedure Belgium" },
	],
	sources: [
		{
			code: "S6",
			kind: "doc",
			title: "Sick leave procedure Belgium (v4)",
			author: "Roy",
			date: "2026-01-01",
			excerpt: "Sick leave notices are passed on within 24 hours of the first day of illness.",
			supports: true,
			note: "Approved general rule",
		},
		{
			code: "S7",
			kind: "teams",
			title: "Teams chat on sick leave",
			author: "Unknown",
			date: "2026-09-01",
			excerpt: "Atlas said 48 hours is fine too for sick leave notices.",
			supports: false,
			note: "Not confirmed: hearsay in chat, nobody approved it",
		},
		{
			code: "S34",
			kind: "doc",
			title: "Sick leave procedure Belgium (v3, old)",
			author: "Roy",
			date: "2023-01-01",
			excerpt: "Sick leave notices are passed on within 72 hours of the first day of illness.",
			supports: false,
			note: "Not valid in this period: expired end of 2025",
		},
		{
			code: "S32",
			kind: "doc",
			title: "Sick leave Netherlands: receipt registration",
			author: "Roy",
			date: "2026-01-01",
			excerpt:
				"The consultant registers on the same working day when the client notice was received.",
			supports: false,
			note: "Other country (NL)",
		},
	],
	people: [
		{
			name: "Roy",
			role: "Owner, sick leave procedure",
			why: "Approved the current Belgian procedure",
		},
	],
	nextStep: { kind: "none" },
};

// Dashboard-only examples, kept apart from the pitch questions so the demo starts clean.
const mealVouchers2027: FinnResult = {
	id: "atlas-meal-vouchers-2027",
	question: "What meal voucher value applies to Atlas from January 2027?",
	context: { country: "BE", client: "Atlas", period: "2027-01" },
	headline: null,
	answer: null,
	trust: {
		score: 0.2,
		reasons: [
			"The current agreement (S40) only runs until 31 December 2026",
			"The €10 in Teams is a proposal, Atlas did not sign it",
			"Sebastian has not published the 2027 indexation yet",
		],
	},
	steps: [
		{ tool: "search_sources", summary: "3 sources on Atlas meal vouchers" },
		{ tool: "assess_trust", summary: "Belgium · Atlas · January 2027: nothing applies" },
		{ tool: "find_people", summary: "Sebastian owns the indexation procedure" },
		{ tool: "contact_person", summary: "Teams message to Sebastian" },
	],
	sources: [
		{
			code: "S40",
			kind: "crm",
			title: "Client agreement Atlas: meal vouchers",
			author: "Roy",
			date: "2026-01-05",
			excerpt: "Atlas grants meal vouchers of €8 per working day in 2026.",
			supports: false,
			note: "Only valid in 2026",
		},
		{
			code: "S41",
			kind: "teams",
			title: "Teams Atlas: budget 2027",
			author: "Wanne",
			date: "2026-10-12",
			excerpt: "Atlas is thinking about €10 per day next year, to be confirmed.",
			supports: false,
			note: "Not confirmed: a proposal, no signed agreement",
		},
		{
			code: "S42",
			kind: "doc",
			title: "Indexation procedure Belgium",
			author: "Sebastian",
			date: "2026-03-01",
			excerpt: "New meal voucher amounts are published in December for the next year.",
			supports: false,
			note: "Explains the gap: 2027 amounts are not out yet",
		},
	],
	people: [{ name: "Sebastian", role: "Procedure owner", why: "Publishes the yearly indexation" }],
	nextStep: {
		kind: "contact_person",
		person: "Sebastian",
		message:
			"Hi Sebastian, which meal voucher value applies to Atlas from January 2027? I only found the 2026 agreement (€8, S40) and an unconfirmed €10 in Teams.",
		threadId: "thread-atlas-meal-vouchers",
	},
};

const nlHolidayPay: FinnResult = {
	id: "nl-holiday-pay",
	question: "When is holiday pay paid out in the Netherlands?",
	context: { country: "NL", client: null, period: "2026-10" },
	headline: "In May",
	answer:
		"Dutch holiday pay (8% of gross salary) is paid out **with the May payroll** [S43]. The June date in the old procedure [S44] no longer applies.",
	trust: {
		score: 0.88,
		reasons: [
			"Current approved Dutch procedure by Sebastian",
			"The June date is from a superseded version",
		],
	},
	steps: [
		{ tool: "search_sources", summary: "2 sources on holiday pay" },
		{ tool: "assess_trust", summary: "Netherlands · October 2026" },
		{ tool: "get_source", summary: "S43 Holiday pay Netherlands" },
	],
	sources: [
		{
			code: "S43",
			kind: "doc",
			title: "Holiday pay Netherlands (v2)",
			author: "Sebastian",
			date: "2026-02-01",
			excerpt: "Holiday pay of 8% is paid out with the May payroll.",
			supports: true,
			note: "Approved general rule",
		},
		{
			code: "S44",
			kind: "doc",
			title: "Holiday pay Netherlands (v1, old)",
			author: "Sebastian",
			date: "2024-01-01",
			excerpt: "Holiday pay is paid out in June.",
			supports: false,
			note: "Superseded by S43",
		},
	],
	people: [
		{ name: "Sebastian", role: "Procedure owner", why: "Approved the Dutch holiday pay procedure" },
	],
	nextStep: { kind: "none" },
};

export const finnScenarios: Record<string, FinnResult> = Object.fromEntries(
	[d1October, d1November, d2, mealVouchers2027, nlHolidayPay].map((result) => [result.id, result]),
);

/** Demo questions in the order of the pitch. A follow-up answers within the previous conversation. */
export const finnScript = [
	{ question: d1October.question, resultId: d1October.id },
	{ question: d1November.question, resultId: d1November.id, followUpOf: d1October.id },
	{ question: d2.question, resultId: d2.id },
];

/** Who owns which knowledge in the demo, shown on the Experts page. */
export const experts = [
	{
		name: "Roy",
		role: "Account owner, Atlas",
		owns: ["Atlas client agreements", "Sick leave procedures BE & NL"],
	},
	{
		name: "Sebastian",
		role: "Procedure owner",
		owns: ["Payroll procedures Belgium", "Payroll procedures Netherlands"],
	},
	{
		name: "Wanne",
		role: "Payroll consultant, Atlas",
		owns: ["Atlas payroll changes", "Client follow-up"],
	},
];
