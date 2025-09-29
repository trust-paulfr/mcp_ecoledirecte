// @ts-ignore
import {McpServer} from "@modelcontextprotocol/sdk/dist/esm/server/mcp";
import Plannings from "./ecoledirecte/plannings";
import Marks from "./ecoledirecte/marks";
import Homeworks from "./ecoledirecte/homeworks";

export function initTools(mcp_server: McpServer) {
    const toolsEnabled = [Plannings, Marks, Homeworks]

    for (const toolClass of toolsEnabled) {
        console.log(`Registering tool: ${toolClass.moduleName}`);

        mcp_server.tool(toolClass.name, toolClass.moduleDescription, toolClass.moduleArguments, toolClass.execute)
    }
}