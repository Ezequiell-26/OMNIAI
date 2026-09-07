import { describe, expect, test } from 'bun:test';
import { InvalidAgentTransitionError, assertTransition, canTransition, transition } from '../state-machine';

describe('agent state machine', () => {
  test('allows the normal execution path', () => {
    expect(canTransition('idle', 'planning')).toBe(true);
    expect(canTransition('planning', 'context_building')).toBe(true);
    expect(transition('running', 'testing')).toBe('testing');
  });

  test('rejects illegal terminal transitions', () => {
    expect(() => assertTransition('completed', 'running')).toThrow(InvalidAgentTransitionError);
    expect(canTransition('cancelled', 'running')).toBe(false);
  });
});
