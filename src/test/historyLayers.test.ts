import { beforeEach, describe, expect, it } from 'vitest';
import { historyStateHasLayer, pushHistoryLayer, readHistoryLayers } from '../utils/historyLayers';

describe('historyLayers', () => {
  beforeEach(() => {
    window.history.replaceState({ root: true }, '', '/');
  });

  it('returns an empty layer stack when state has no layers', () => {
    expect(readHistoryLayers(window.history.state)).toEqual([]);
  });

  it('pushes a new history entry while preserving existing state', () => {
    pushHistoryLayer('modal-1');

    expect(window.history.state).toMatchObject({ root: true });
    expect(readHistoryLayers(window.history.state)).toEqual(['modal-1']);
    expect(historyStateHasLayer(window.history.state, 'modal-1')).toBe(true);
  });

  it('appends nested layers in order', () => {
    pushHistoryLayer('modal-1');
    pushHistoryLayer('sheet-2');

    expect(readHistoryLayers(window.history.state)).toEqual(['modal-1', 'sheet-2']);
  });
});
