// MCP Tool Registry

import type { MCPTool } from '../types/mcp.js';

export class ToolRegistry {
  private tools: Map<string, MCPTool> = new Map();

  register(tool: MCPTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool '${tool.name}' is already registered`);
    }

    this.tools.set(tool.name, tool);
  }

  getTools(): MCPTool[] {
    return Array.from(this.tools.values());
  }

  getTool(name: string): MCPTool | undefined {
    return this.tools.get(name);
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  getToolDefinitions() {
    return this.getTools().map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    }));
  }

  async execute(name: string, params: any) {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }

    return await tool.handler(params);
  }

  clear(): void {
    this.tools.clear();
  }

  size(): number {
    return this.tools.size;
  }
}
