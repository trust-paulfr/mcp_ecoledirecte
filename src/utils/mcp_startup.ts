import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { InMemoryEventStore } from "@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js";
import {McpServer} from "@modelcontextprotocol/sdk/server/mcp.js";

import { Application, Request, Response } from "express";
import {Server} from "node:net";
import {randomUUID} from "node:crypto";

const transports: { [sessionId: string]: StreamableHTTPServerTransport } = {};

class McpStartup {
    static async get(express_server: Application, mcp_server: McpServer, request: Request, response: Response) {
        console.log("GET /mcp called");

        try {
            const sessionId = request.headers['mcp-session-id'] as string | undefined;
            if (!sessionId || !transports[sessionId]) {
                console.log(`Invalid session ID in GET request: ${sessionId}`);
                response.status(400).send('Invalid or missing session ID');
                return;
            }

            // Check for Last-Event-ID header for resumability
            const lastEventId = request.headers['last-event-id'] as string | undefined;
            if (lastEventId) {
                console.log(`Client reconnecting with Last-Event-ID: ${lastEventId}`);
            } else {
                console.log(`Establishing new SSE stream for session ${sessionId}`);
            }

            const transport = transports[sessionId];

            // Set up connection close monitoring
            response.on('close', () => {
                console.log(`SSE connection closed for session ${sessionId}`);
            });

            console.log(`Starting SSE transport.handleRequest for session ${sessionId}...`);
            const startTime = Date.now();
            await transport.handleRequest(request, response);
            const duration = Date.now() - startTime;
            console.log(`SSE stream setup completed in ${duration}ms for session: ${sessionId}`);
        } catch (error) {
            console.error('Error handling GET request:', error);
            if (!response.headersSent) {
                response.status(500).send('Internal server error');
            }
        }
    }

    static async post(express_server: Application, mcp_server: McpServer, request: Request, response: Response) {
        const originalJson = response.json;
        response.json = function(body) {
            console.log(`Response being sent:`, JSON.stringify(body, null, 2));
            return originalJson.call(this, body);
        };

        try {
            // Check for existing session ID
            const sessionId = request.headers['mcp-session-id'] as string | undefined;
            let transport: StreamableHTTPServerTransport;

            if (sessionId && transports[sessionId]) {
                // Reuse existing transport
                console.log(`Reusing session: ${sessionId}`);
                transport = transports[sessionId];
            } else if (!sessionId && isInitializeRequest(request.body)) {
                console.log(`New session request: ${request.body.method}`);
                // New initialization request
                const eventStore = new InMemoryEventStore();
                transport = new StreamableHTTPServerTransport({
                    sessionIdGenerator: () => randomUUID(),
                    enableJsonResponse: true,
                    eventStore, // Enable resumability
                    onsessioninitialized: (sessionId: string | number) => {
                        // Store the transport by session ID
                        console.log(`Session initialized: ${sessionId}`);
                        transports[sessionId] = transport;
                    }
                });

                // Clean up transport when closed
                transport.onclose = () => {
                    const sid = transport.sessionId;
                    if (sid && transports[sid]) {
                        console.log(`Transport closed for session ${sid}, removing from transports map`);
                        delete transports[sid];
                    }
                };

                // Connect to the MCP server BEFORE handling the request
                console.log(`Connecting transport to MCP server...`);
                await mcp_server.connect(transport);
                console.log(`Transport connected to MCP server successfully`);

                console.log(`Handling initialization request...`);
                await transport.handleRequest(request, response, request.body);
                console.log(`Initialization request handled, response sent`);
                return; // Already handled
            } else {
                console.error('Invalid request: No valid session ID or initialization request');
                // Invalid request
                response.status(400).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32000,
                        message: 'Bad Request: No valid session ID provided',
                    },
                    id: null,
                });
                return;
            }

            console.log(`Handling request for session: ${transport.sessionId}`);
            console.log(`Request body:`, JSON.stringify(request.body, null, 2));

            console.log(`Calling transport.handleRequest...`);
            const startTime = Date.now();
            await transport.handleRequest(request, response, request.body);
            const duration = Date.now() - startTime;
            console.log(`Request handling completed in ${duration}ms for session: ${transport.sessionId}`);
        } catch (error) {
            console.error('Error handling MCP request:', error);
            if (!response.headersSent) {
                response.status(500).json({
                    jsonrpc: '2.0',
                    error: {
                        code: -32603,
                        message: 'Internal server error',
                    },
                    id: null,
                });
            }
        }
    }
    static async delete(express_server: Application, mcp_server: McpServer, request: Request, response: Response) {
        console.log("DELETE /mcp called");
        console.log(`DELETE Request received: ${request.method} ${request.url}`);
        try {
            const sessionId = request.headers['mcp-session-id'] as string | undefined;
            if (!sessionId || !transports[sessionId]) {
                console.log(`Invalid session ID in DELETE request: ${sessionId}`);
                response.status(400).send('Invalid or missing session ID');
                return;
            }

            console.log(`Received session termination request for session ${sessionId}`);
            const transport = transports[sessionId];

            // Capture response for logging
            const originalSend = response.send;
            response.send = function(body) {
                console.log(`DELETE response being sent:`, body);
                return originalSend.call(this, body);
            };

            console.log(`Processing session termination...`);
            const startTime = Date.now();
            await transport.handleRequest(request, response);
            const duration = Date.now() - startTime;
            console.log(`Session termination completed in ${duration}ms for session: ${sessionId}`);

            // Check if transport was actually closed
            setTimeout(() => {
                if (transports[sessionId]) {
                    console.log(`Note: Transport for session ${sessionId} still exists after DELETE request`);
                } else {
                    console.log(`Transport for session ${sessionId} successfully removed after DELETE request`);
                }
            }, 100);
        } catch (error) {
            console.error('Error handling DELETE request:', error);
            if (!response.headersSent) {
                response.status(500).send('Error processing session termination');
            }
        }
    }
}

export function mcpStartup(express_app: Application, express_server: Server,  mcp_server: McpServer) {
    express_app.get('/mcp', (req: Request, res: Response) =>
        McpStartup.get(express_app, mcp_server, req, res)
    );

    express_app.post('/mcp', (req: Request, res: Response) =>
        McpStartup.post(express_app, mcp_server, req, res)
    );

    express_app.delete('/mcp', (req: Request, res: Response) =>
        McpStartup.delete(express_app, mcp_server, req, res)
    );

    process.on('SIGINT', async () => {
        console.log('Shutting down server...');

        for (const sessionId in transports) {
            try {
                console.log(`Closing transport for session ${sessionId}`);
                await transports[sessionId].close();
                delete transports[sessionId];
            } catch (error) {
                console.error(`Error closing transport for session ${sessionId}:`, error);
            }
        }

        express_server.close();
        await mcp_server.close();

        console.log('Server shutdown complete');
        process.exit(0);
    });
}