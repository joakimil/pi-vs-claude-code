import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import path from "node:path";

export default function (pi: ExtensionAPI) {
  const soundFile = path.join(import.meta.dirname, "sounds", "done.wav");

  pi.on("agent_end", async (_event, ctx) => {
    try {
      await pi.exec("afplay", [soundFile], { timeout: 3000 });
    } catch {
      process.stdout.write("\x07");
    }
  });
}
