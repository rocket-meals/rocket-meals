// Einstiegspunkt: MCP-Server über stdio (npm run mcp). Spricht per HTTP mit AB_URL.
// Schlüssel: AB_AGENT_KEY (agent-Rolle, empfohlen) oder AB_API_KEY.
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { RelayClient } from "../shared/client.ts";
import { createMcpServer } from "./server.ts";

const apiKey = process.env.AB_AGENT_KEY || process.env.AB_API_KEY;
const server = createMcpServer({ client: new RelayClient(apiKey ? { apiKey } : {}) });
await server.connect(new StdioServerTransport());
// stdout gehört dem MCP-Protokoll – Logs nur auf stderr
console.error(`agent-board MCP bereit (AB_URL=${process.env.AB_URL ?? "http://127.0.0.1:4317"})`);
