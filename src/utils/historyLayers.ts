const HISTORY_LAYER_STACK_KEY = '__otwqrHistoryLayers';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function buildStateWithLayers(state: unknown, layers: string[]) {
  if (isRecord(state)) {
    return {
      ...state,
      [HISTORY_LAYER_STACK_KEY]: layers,
    };
  }

  return {
    [HISTORY_LAYER_STACK_KEY]: layers,
  };
}

export function readHistoryLayers(state: unknown): string[] {
  if (!isRecord(state)) return [];

  const layers = state[HISTORY_LAYER_STACK_KEY];
  if (!Array.isArray(layers)) return [];

  return layers.filter((layer): layer is string => typeof layer === 'string' && layer.length > 0);
}

export function historyStateHasLayer(state: unknown, layerToken: string) {
  return readHistoryLayers(state).includes(layerToken);
}

export function pushHistoryLayer(layerToken: string) {
  const currentState = window.history.state;
  const currentLayers = readHistoryLayers(currentState);

  window.history.pushState(
    buildStateWithLayers(currentState, [...currentLayers, layerToken]),
    '',
    window.location.href,
  );
}

export function createHistoryLayerToken(prefix = 'layer') {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
