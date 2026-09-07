import type { ExecutionMode, RoutingPolicy, RunUsage } from './contracts';

export interface AIMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
}

export interface AIToolCall {
  id: string;
  name: string;
  input: unknown;
}

export interface AIRequest {
  messages: AIMessage[];
  model: string;
  provider: string;
  mode: ExecutionMode;
  tools?: unknown[];
  signal?: AbortSignal;
}

export interface AIResponse {
  text: string;
  toolCalls: AIToolCall[];
  usage?: RunUsage;
  finishReason?: string;
}

export interface AIProvider {
  readonly id: string;
  readonly capabilities: readonly string[];
  generate(request: AIRequest): Promise<AIResponse>;
  stream?(request: AIRequest): AsyncIterable<AIStreamEvent>;
  cancel?(requestId: string): Promise<void>;
}

export type AIStreamEvent =
  | { type: 'text.delta'; text: string }
  | { type: 'tool.call'; call: AIToolCall }
  | { type: 'usage'; usage: RunUsage }
  | { type: 'done'; response?: AIResponse }
  | { type: 'error'; message: string };

export interface ProviderRegistry {
  register(provider: AIProvider): void;
  get(id: string): AIProvider | undefined;
  list(): AIProvider[];
}

export class DefaultProviderRegistry implements ProviderRegistry {
  private readonly providers = new Map<string, AIProvider>();

  register(provider: AIProvider): void {
    if (this.providers.has(provider.id)) throw new Error(`Provider already registered: ${provider.id}`);
    this.providers.set(provider.id, provider);
  }

  get(id: string): AIProvider | undefined {
    return this.providers.get(id);
  }

  list(): AIProvider[] {
    return [...this.providers.values()];
  }
}

export interface AIGatewayOptions {
  providers?: ProviderRegistry;
  fallbackProviders?: string[];
}

export class AIGateway {
  private readonly providers: ProviderRegistry;
  private readonly fallbackProviders: string[];

  constructor(options: AIGatewayOptions = {}) {
    this.providers = options.providers ?? new DefaultProviderRegistry();
    this.fallbackProviders = options.fallbackProviders ?? [];
  }

  async generate(request: AIRequest): Promise<AIResponse> {
    const providerIds = [request.provider, ...this.fallbackProviders.filter((id) => id !== request.provider)];
    let lastError: unknown;

    for (const id of providerIds) {
      const provider = this.providers.get(id);
      if (!provider) continue;
      try {
        return await provider.generate(request);
      } catch (error) {
        lastError = error;
      }
    }

    throw lastError instanceof Error ? lastError : new Error('No AI provider could complete the request');
  }
}

export function requiredCapabilities(task: 'planning' | 'coding' | 'testing' | 'review' | 'research' | 'general', mode: ExecutionMode, policy: RoutingPolicy): string[] {
  const capabilities = new Set<string>();
  if (task === 'coding') ['code', 'reasoning', 'tools'].forEach((value) => capabilities.add(value));
  if (task === 'planning') ['reasoning', 'long-context'].forEach((value) => capabilities.add(value));
  if (task === 'research') ['web', 'long-context'].forEach((value) => capabilities.add(value));
  if (mode === 'local' || policy === 'local') capabilities.add('local');
  if (mode === 'private' || policy === 'private') capabilities.add('private');
  return [...capabilities];
}
