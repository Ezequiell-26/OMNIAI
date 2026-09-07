import { ToolRegistry } from './tool-registry';
import { FILE_TOOLS } from './tools/file-tools';

let registry: ToolRegistry | undefined;
export function getToolRegistry() { if (!registry) { registry = new ToolRegistry(); for (const tool of FILE_TOOLS) registry.register(tool); } return registry; }
