// Tool registry tests

import { beforeEach, describe, expect, it } from 'vitest';
import { ToolRegistry } from '../../../src/server/registry.js';
import type { MCPTool, MCPToolResponse } from '../../../src/types/mcp.js';

describe('ToolRegistry', () => {
  let registry: ToolRegistry;

  const mockTool: MCPTool = {
    name: 'test_tool',
    description: 'A test tool',
    inputSchema: {
      type: 'object',
      properties: {
        param: { type: 'string' },
      },
    },
    handler: async (params: any): Promise<MCPToolResponse> => ({
      success: true,
      data: { result: `Hello ${params.param || 'World'}` },
      metadata: {
        timestamp: Date.now(),
        latency: 0,
      },
    }),
  };

  beforeEach(() => {
    registry = new ToolRegistry();
  });

  it('should register tools', () => {
    registry.register(mockTool);
    expect(registry.size()).toBe(1);
    expect(registry.getToolNames()).toEqual(['test_tool']);
  });

  it('should not allow duplicate tool names', () => {
    registry.register(mockTool);
    expect(() => registry.register(mockTool)).toThrow("Tool 'test_tool' is already registered");
  });

  it('should retrieve registered tools', () => {
    registry.register(mockTool);
    const tool = registry.getTool('test_tool');
    expect(tool).toBe(mockTool);
  });

  it('should return undefined for non-existent tools', () => {
    const tool = registry.getTool('non_existent');
    expect(tool).toBeUndefined();
  });

  it('should return tool definitions', () => {
    registry.register(mockTool);
    const definitions = registry.getToolDefinitions();

    expect(definitions).toHaveLength(1);
    expect(definitions[0]).toEqual({
      name: 'test_tool',
      description: 'A test tool',
      inputSchema: mockTool.inputSchema,
    });
  });

  it('should execute tools', async () => {
    registry.register(mockTool);
    const result = await registry.execute('test_tool', { param: 'Test' });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ result: 'Hello Test' });
  });

  it('should throw error for non-existent tool execution', async () => {
    await expect(registry.execute('non_existent', {})).rejects.toThrow(
      "Tool 'non_existent' not found",
    );
  });

  it('should clear all tools', () => {
    registry.register(mockTool);
    expect(registry.size()).toBe(1);

    registry.clear();
    expect(registry.size()).toBe(0);
    expect(registry.getToolNames()).toEqual([]);
  });
});
