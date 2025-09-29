import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import express from "express";
import 'dotenv/config';
import {mcpStartup} from "./utils/mcp_startup";
import {apiKeyAuth} from "./utils/middleware";
import {initTools} from "./tools/tools";

const express_app = express();
express_app.use(express.json());
express_app.use(apiKeyAuth)

const express_server = express_app.listen(process.env.MCP_SERVER_PORT, () => {
    console.log(`MCP Streamable HTTP Server listening on port ${process.env.MCP_SERVER_PORT}`);
});

express_server.on('connect', (transport) => {
    console.log(`[Server] Transport connected: ${transport}`);
});

express_server.on('disconnect', (transport) => {
    console.log(`[Server] Transport disconnected: ${transport.sessionId}`);
});

express_server.on('request', (request, transport) => {
    console.log(`[Server] Received request: ${request.method} from transport: ${transport}`);
});

express_server.on('response', (response, transport) => {
    console.log(`[Server] Sending response for id: ${response.id} to transport: ${transport.sessionId}`);
});

express_server.on('notification', (notification, transport) => {
    console.log(`[Server] Sending notification: ${notification.method} to transport: ${transport.sessionId}`);
});

express_server.on('error', (error: any, transport: any) => {
    console.error(`[Server] Error with transport ${transport?.sessionId || 'unknown'}:`, error);
});

const mcp_server = new McpServer({
    name: process.env.MCP_SERVER_NAME || 'My MCP Server',
    version: "1.0.0",
}, {
    capabilities: {
        logging: {},
        tools: {
            listChanged: false
        }
    }
});

initTools(mcp_server);
mcpStartup(express_app, express_server, mcp_server)

export default { express_server, mcp_server};