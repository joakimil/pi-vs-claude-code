/**
 * Vercel — CLI tools for deploying and managing Vercel projects
 *
 * Tools: vercel_deploy, vercel_list, vercel_env, vercel_inspect, vercel_logs, vercel_domains
 *
 * Usage: pi -e extensions/vercel.ts
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import {
	truncateTail,
	DEFAULT_MAX_BYTES,
	DEFAULT_MAX_LINES,
	formatSize,
} from "@mariozechner/pi-coding-agent";
import { Type } from "@sinclair/typebox";
import { StringEnum } from "@mariozechner/pi-ai";
import { Text } from "@mariozechner/pi-tui";

// ─── Helpers ──────────────────────────────────────────────────────

interface CmdResult {
	stdout: string;
	stderr: string;
	exitCode: number;
	duration: number;
}

async function run(
	pi: ExtensionAPI,
	args: string[],
	signal?: AbortSignal,
	timeout = 120_000
): Promise<CmdResult> {
	const start = Date.now();
	// Pass --token if VERCEL_TOKEN is set (CLI doesn't auto-read env var)
	const token = process.env.VERCEL_TOKEN;
	const tokenArgs = token ? ["--token", token] : [];
	const result = await pi.exec("npx", ["vercel", ...args, ...tokenArgs], { signal, timeout });
	return {
		stdout: result.stdout,
		stderr: result.stderr,
		exitCode: result.code ?? 1,
		duration: Date.now() - start,
	};
}

function truncate(output: string): string {
	const t = truncateTail(output, {
		maxLines: DEFAULT_MAX_LINES,
		maxBytes: DEFAULT_MAX_BYTES,
	});
	let result = t.content;
	if (t.truncated) {
		result += `\n[Truncated: ${t.outputLines}/${t.totalLines} lines, ${formatSize(t.outputBytes)}/${formatSize(t.totalBytes)}]`;
	}
	return result;
}

function combined(r: CmdResult): string {
	return truncate(r.stdout + (r.stderr ? `\nSTDERR:\n${r.stderr}` : ""));
}

function statusIcon(ok: boolean): string {
	return ok ? "✓" : "✗";
}

// ─── Extension ────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {

	// ══════════════════════════════════════════════════════════════
	// Tool: vercel_deploy
	// ══════════════════════════════════════════════════════════════

	pi.registerTool({
		name: "vercel_deploy",
		label: "Vercel Deploy",
		description:
			"Deploy the current project (or a specific directory) to Vercel. " +
			"Use --prod for production deployments. Returns the deployment URL.",
		parameters: Type.Object({
			production: Type.Optional(
				Type.Boolean({ description: "Deploy to production (default: preview)" })
			),
			directory: Type.Optional(
				Type.String({ description: "Directory to deploy (default: current dir)" })
			),
			force: Type.Optional(
				Type.Boolean({ description: "Force a new deployment even if nothing changed" })
			),
		}),

		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const { production, directory, force } = params as {
				production?: boolean;
				directory?: string;
				force?: boolean;
			};

			if (production && ctx.hasUI) {
				const ok = await ctx.ui.confirm(
					"Production Deploy",
					"Deploy to production? This will be live immediately."
				);
				if (!ok) {
					return {
						content: [{ type: "text", text: "Production deploy cancelled by user." }],
						details: { cancelled: true },
					};
				}
			}

			const target = production ? "production" : "preview";
			onUpdate?.({
				content: [{ type: "text", text: `Deploying to ${target}...` }],
				details: { phase: "deploying" },
			});

			const args = ["--yes"];
			if (production) args.push("--prod");
			if (force) args.push("--force");
			if (directory) args.push(directory);

			const result = await run(pi, args, signal, 300_000); // 5 min timeout for deploys

			// Try to extract the deployment URL from output
			const urlMatch = result.stdout.match(/https:\/\/[^\s]+\.vercel\.app[^\s]*/);
			const deployUrl = urlMatch?.[0] || null;

			return {
				content: [{
					type: "text",
					text: result.exitCode === 0
						? `Deploy succeeded (${result.duration}ms)${deployUrl ? `\nURL: ${deployUrl}` : ""}\n\n${combined(result)}`
						: `Deploy failed (exit ${result.exitCode}, ${result.duration}ms)\n\n${combined(result)}`,
				}],
				details: {
					target,
					exitCode: result.exitCode,
					duration: result.duration,
					url: deployUrl,
					directory: directory || ".",
				},
				isError: result.exitCode !== 0,
			};
		},

		renderCall(args, theme) {
			let text = theme.fg("toolTitle", theme.bold("vercel deploy "));
			const target = args.production ? "production" : "preview";
			const color = args.production ? "error" : "success";
			text += theme.fg(color, target);
			if (args.directory) text += theme.fg("dim", ` ${args.directory}`);
			if (args.force) text += theme.fg("warning", " --force");
			return new Text(text, 0, 0);
		},

		renderResult(result, { expanded, isPartial }, theme) {
			if (isPartial) {
				return new Text(theme.fg("warning", "⏳ Deploying..."), 0, 0);
			}
			if (result.details?.cancelled) {
				return new Text(theme.fg("warning", "⊘ Cancelled"), 0, 0);
			}
			const d = result.details || {};
			const ok = d.exitCode === 0;
			let text = theme.fg(ok ? "success" : "error", `${statusIcon(ok)} ${d.target}`);
			text += theme.fg("dim", ` ${d.duration}ms`);
			if (d.url) text += "\n  " + theme.fg("accent", d.url);
			if (expanded) {
				const raw = result.content?.[0]?.type === "text" ? result.content[0].text : "";
				if (raw) text += "\n" + theme.fg("dim", raw);
			}
			return new Text(text, 0, 0);
		},
	});

	// ══════════════════════════════════════════════════════════════
	// Tool: vercel_list
	// ══════════════════════════════════════════════════════════════

	pi.registerTool({
		name: "vercel_list",
		label: "Vercel List",
		description:
			"List recent Vercel deployments for the current project. " +
			"Shows deployment URLs, status, and timestamps.",
		parameters: Type.Object({
			limit: Type.Optional(
				Type.Number({ description: "Max deployments to show (default: 10)" })
			),
		}),

		async execute(toolCallId, params, signal) {
			const { limit } = params as { limit?: number };
			const args = ["list"];
			if (limit) args.push("--limit", String(limit));

			const result = await run(pi, args, signal, 30_000);
			return {
				content: [{ type: "text", text: combined(result) }],
				details: { exitCode: result.exitCode, limit: limit || 10 },
				isError: result.exitCode !== 0,
			};
		},

		renderCall(args, theme) {
			let text = theme.fg("toolTitle", theme.bold("vercel list"));
			if (args.limit) text += theme.fg("dim", ` --limit ${args.limit}`);
			return new Text(text, 0, 0);
		},

		renderResult(result, { expanded, isPartial }, theme) {
			if (isPartial) return new Text(theme.fg("warning", "⏳ Fetching..."), 0, 0);
			const ok = result.details?.exitCode === 0;
			let text = theme.fg(ok ? "success" : "error", `${statusIcon(ok)} deployments`);
			if (expanded) {
				const raw = result.content?.[0]?.type === "text" ? result.content[0].text : "";
				if (raw) text += "\n" + theme.fg("dim", raw);
			}
			return new Text(text, 0, 0);
		},
	});

	// ══════════════════════════════════════════════════════════════
	// Tool: vercel_env
	// ══════════════════════════════════════════════════════════════

	pi.registerTool({
		name: "vercel_env",
		label: "Vercel Env",
		description:
			"Manage Vercel environment variables. Supports: list (ls), add, remove (rm), pull. " +
			"Use 'pull' to sync remote env vars to a local .env file.",
		parameters: Type.Object({
			action: StringEnum(["ls", "add", "rm", "pull"] as const, {
				description: "Action to perform",
			}),
			key: Type.Optional(
				Type.String({ description: "Environment variable name (for add/rm)" })
			),
			value: Type.Optional(
				Type.String({ description: "Environment variable value (for add)" })
			),
			environment: Type.Optional(
				StringEnum(["development", "preview", "production"] as const, {
					description: "Target environment (default: all)",
				})
			),
			filename: Type.Optional(
				Type.String({ description: "Local file for pull (default: .env.local)" })
			),
		}),

		async execute(toolCallId, params, signal, onUpdate, ctx) {
			const { action, key, value, environment, filename } = params as {
				action: string;
				key?: string;
				value?: string;
				environment?: string;
				filename?: string;
			};

			const args = ["env", action];

			switch (action) {
				case "ls":
					if (environment) args.push(environment);
					break;
				case "add":
					if (!key || !value) {
						return {
							content: [{ type: "text", text: "Error: 'key' and 'value' are required for add." }],
							isError: true,
						};
					}
					args.push(key, environment || "development", "--yes");
					break;
				case "rm":
					if (!key) {
						return {
							content: [{ type: "text", text: "Error: 'key' is required for rm." }],
							isError: true,
						};
					}
					args.push(key, environment || "development", "--yes");
					break;
				case "pull":
					args.push(filename || ".env.local", "--yes");
					break;
			}

			// For add, we need to pipe the value via stdin
			let result: CmdResult;
			if (action === "add") {
				const start = Date.now();
				const token = process.env.VERCEL_TOKEN;
				const tokenFlag = token ? ` --token ${token}` : "";
				const r = await pi.exec("bash", [
					"-c",
					`echo "${value}" | npx vercel env add ${key} ${environment || "development"} --yes${tokenFlag}`
				], { signal, timeout: 30_000 });
				result = {
					stdout: r.stdout,
					stderr: r.stderr,
					exitCode: r.code ?? 1,
					duration: Date.now() - start,
				};
			} else {
				result = await run(pi, args.slice(1), signal, 30_000);
			}

			return {
				content: [{ type: "text", text: combined(result) }],
				details: { action, key, environment, exitCode: result.exitCode },
				isError: result.exitCode !== 0,
			};
		},

		renderCall(args, theme) {
			let text = theme.fg("toolTitle", theme.bold(`vercel env ${args.action || "?"} `));
			if (args.key) text += theme.fg("accent", args.key + " ");
			if (args.environment) text += theme.fg("dim", `(${args.environment})`);
			return new Text(text, 0, 0);
		},

		renderResult(result, { expanded }, theme) {
			const d = result.details || {};
			const ok = d.exitCode === 0;
			let text = theme.fg(ok ? "success" : "error", `${statusIcon(ok)} env ${d.action}`);
			if (d.key) text += " " + theme.fg("accent", d.key);
			if (expanded) {
				const raw = result.content?.[0]?.type === "text" ? result.content[0].text : "";
				if (raw) text += "\n" + theme.fg("dim", raw);
			}
			return new Text(text, 0, 0);
		},
	});

	// ══════════════════════════════════════════════════════════════
	// Tool: vercel_inspect
	// ══════════════════════════════════════════════════════════════

	pi.registerTool({
		name: "vercel_inspect",
		label: "Vercel Inspect",
		description:
			"Inspect a specific Vercel deployment by URL. Shows build info, " +
			"routes, functions, regions, and status.",
		parameters: Type.Object({
			url: Type.String({ description: "Deployment URL to inspect (e.g. my-app-abc123.vercel.app)" }),
		}),

		async execute(toolCallId, params, signal) {
			const { url } = params as { url: string };
			const result = await run(pi, ["inspect", url], signal, 30_000);
			return {
				content: [{ type: "text", text: combined(result) }],
				details: { url, exitCode: result.exitCode },
				isError: result.exitCode !== 0,
			};
		},

		renderCall(args, theme) {
			let text = theme.fg("toolTitle", theme.bold("vercel inspect "));
			text += theme.fg("accent", args.url || "?");
			return new Text(text, 0, 0);
		},

		renderResult(result, { expanded }, theme) {
			const d = result.details || {};
			const ok = d.exitCode === 0;
			let text = theme.fg(ok ? "success" : "error", `${statusIcon(ok)} inspected`);
			text += " " + theme.fg("dim", d.url || "");
			if (expanded) {
				const raw = result.content?.[0]?.type === "text" ? result.content[0].text : "";
				if (raw) text += "\n" + theme.fg("dim", raw);
			}
			return new Text(text, 0, 0);
		},
	});

	// ══════════════════════════════════════════════════════════════
	// Tool: vercel_logs
	// ══════════════════════════════════════════════════════════════

	pi.registerTool({
		name: "vercel_logs",
		label: "Vercel Logs",
		description:
			"Fetch runtime or build logs for a Vercel deployment. " +
			"Useful for debugging failed deployments or runtime errors.",
		parameters: Type.Object({
			url: Type.String({ description: "Deployment URL to fetch logs for" }),
		}),

		async execute(toolCallId, params, signal) {
			const { url } = params as { url: string };
			const result = await run(pi, ["logs", url], signal, 30_000);
			return {
				content: [{ type: "text", text: combined(result) }],
				details: { url, exitCode: result.exitCode },
				isError: result.exitCode !== 0,
			};
		},

		renderCall(args, theme) {
			let text = theme.fg("toolTitle", theme.bold("vercel logs "));
			text += theme.fg("accent", args.url || "?");
			return new Text(text, 0, 0);
		},

		renderResult(result, { expanded }, theme) {
			const d = result.details || {};
			const ok = d.exitCode === 0;
			let text = theme.fg(ok ? "success" : "error", `${statusIcon(ok)} logs`);
			if (expanded) {
				const raw = result.content?.[0]?.type === "text" ? result.content[0].text : "";
				if (raw) text += "\n" + theme.fg("dim", raw);
			}
			return new Text(text, 0, 0);
		},
	});

	// ══════════════════════════════════════════════════════════════
	// Tool: vercel_domains
	// ══════════════════════════════════════════════════════════════

	pi.registerTool({
		name: "vercel_domains",
		label: "Vercel Domains",
		description:
			"Manage domains for the current Vercel project. " +
			"Supports: list (ls), add, remove (rm). Shows DNS configuration status.",
		parameters: Type.Object({
			action: StringEnum(["ls", "add", "rm"] as const, {
				description: "Action to perform",
			}),
			domain: Type.Optional(
				Type.String({ description: "Domain name (required for add/rm)" })
			),
		}),

		async execute(toolCallId, params, signal) {
			const { action, domain } = params as { action: string; domain?: string };
			const args = ["domains", action];
			if (domain) args.push(domain);
			if (action !== "ls") args.push("--yes");

			const result = await run(pi, args, signal, 30_000);
			return {
				content: [{ type: "text", text: combined(result) }],
				details: { action, domain, exitCode: result.exitCode },
				isError: result.exitCode !== 0,
			};
		},

		renderCall(args, theme) {
			let text = theme.fg("toolTitle", theme.bold(`vercel domains ${args.action || "?"} `));
			if (args.domain) text += theme.fg("accent", args.domain);
			return new Text(text, 0, 0);
		},

		renderResult(result, { expanded }, theme) {
			const d = result.details || {};
			const ok = d.exitCode === 0;
			let text = theme.fg(ok ? "success" : "error", `${statusIcon(ok)} domains ${d.action}`);
			if (d.domain) text += " " + theme.fg("accent", d.domain);
			if (expanded) {
				const raw = result.content?.[0]?.type === "text" ? result.content[0].text : "";
				if (raw) text += "\n" + theme.fg("dim", raw);
			}
			return new Text(text, 0, 0);
		},
	});

	// ══════════════════════════════════════════════════════════════
	// Tool: vercel_project
	// ══════════════════════════════════════════════════════════════

	pi.registerTool({
		name: "vercel_project",
		label: "Vercel Project",
		description:
			"Link, unlink, or get info about the current Vercel project. " +
			"Use 'link' to connect a local directory to a Vercel project, " +
			"'info' to show project settings, or 'unlink' to disconnect.",
		parameters: Type.Object({
			action: StringEnum(["link", "unlink", "info"] as const, {
				description: "Action to perform",
			}),
		}),

		async execute(toolCallId, params, signal) {
			const { action } = params as { action: string };

			let result: CmdResult;
			switch (action) {
				case "link":
					result = await run(pi, ["link", "--yes"], signal, 30_000);
					break;
				case "unlink":
					result = await run(pi, ["unlink", "--yes"], signal, 15_000);
					break;
				case "info":
					result = await run(pi, ["project", "ls"], signal, 15_000);
					break;
				default:
					return {
						content: [{ type: "text", text: `Unknown action: ${action}` }],
						isError: true,
					};
			}

			return {
				content: [{ type: "text", text: combined(result) }],
				details: { action, exitCode: result.exitCode },
				isError: result.exitCode !== 0,
			};
		},

		renderCall(args, theme) {
			const text = theme.fg("toolTitle", theme.bold(`vercel project ${args.action || "?"}`));
			return new Text(text, 0, 0);
		},

		renderResult(result, { expanded }, theme) {
			const d = result.details || {};
			const ok = d.exitCode === 0;
			let text = theme.fg(ok ? "success" : "error", `${statusIcon(ok)} project ${d.action}`);
			if (expanded) {
				const raw = result.content?.[0]?.type === "text" ? result.content[0].text : "";
				if (raw) text += "\n" + theme.fg("dim", raw);
			}
			return new Text(text, 0, 0);
		},
	});
}
