import {
  OMNIAI_CORE_VERSION,
  type AgentEvent,
  type CoreCapabilityMap,
  type CoreConfig,
  type CoreEventSink,
  type ExecutionMode,
  type RoutingPolicy,
} from './contracts';

const DEFAULT_CAPABILITIES: CoreCapabilityMap = {
  web: true,
  windows: true,
  localFiles: true,
  git: false,
  sandbox: false,
  mcp: true,
  multiAgent: true,
};

export interface OmniAICore {
  readonly version: string;
  readonly mode: ExecutionMode;
  readonly routingPolicy: RoutingPolicy;
  readonly capabilities: Readonly<CoreCapabilityMap>;
  readonly events: CoreEventSink;
}

export function createOmniAICore(config: CoreConfig = {}): OmniAICore {
  const listeners = new Set<(event: AgentEvent) => void>();
  const capabilities = Object.freeze({
    ...DEFAULT_CAPABILITIES,
    ...config.capabilities,
  });

  const events: CoreEventSink = {
    emit(event) {
      for (const listener of listeners) listener(event);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  return Object.freeze({
    version: config.version ?? OMNIAI_CORE_VERSION,
    mode: config.mode ?? 'local',
    routingPolicy: config.routingPolicy ?? 'auto',
    capabilities,
    events,
  });
}

let singleton: OmniAICore | undefined;

export function getOmniAICore(config?: CoreConfig): OmniAICore {
  singleton ??= createOmniAICore(config);
  return singleton;
}
