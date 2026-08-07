import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(currentDirectory, "..", "..");
const serverPath = resolve(currentDirectory, "server.mjs");
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverPath],
  cwd: projectRoot,
  stderr: "pipe",
});
const client = new Client({ name: "epixum-postdiplomatura-pocketbase-smoke", version: "1.0.0" });

try {
  await client.connect(transport);
  const listed = await client.listTools();
  const health = await client.callTool({ name: "pocketbase_health", arguments: {} });
  if (health.isError) throw new Error(health.content?.[0]?.text || "La herramienta health devolvió un error.");
  const schema = await client.callTool({ name: "pocketbase_validate_epixum_schema", arguments: {} });
  if (schema.isError) throw new Error(schema.content?.[0]?.text || "No se pudo validar el esquema.");

  process.stdout.write(`${JSON.stringify({
    tools: listed.tools.map((tool) => tool.name),
    health: health.structuredContent,
    schema: schema.structuredContent,
  }, null, 2)}\n`);
} finally {
  await client.close();
}
