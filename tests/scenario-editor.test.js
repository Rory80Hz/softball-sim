import { describe, expect, it, vi } from 'vitest';
import { BASES } from '../src/constants.js';
import { ScenarioEditor } from '../src/ui/ScenarioEditor.js';

function editorDefinition() {
  return Object.assign(Object.create(ScenarioEditor.prototype), {
    hitLocations: [
      ['center', 'Center field', { x: 0, y: 245 }],
      ['left_infield', 'Left infield', { x: -20, y: 105 }],
    ],
    runnerOptions: [
      { label: 'Bases empty', bases: [] },
      { label: 'First', bases: ['first'] },
      { label: 'Loaded', bases: ['first', 'second', 'third'] },
    ],
  });
}

describe('ScenarioEditor scenario definitions', () => {
  it('creates a batter path through every base', () => {
    const definition = editorDefinition().getDefinition(
      { value: 'center' },
      { value: 'center' },
      { value: '0' },
      { value: 'batter-1' },
    );

    expect(definition.hitType).toBe('center');
    expect(definition.hitTarget).toEqual({ x: 0, y: 245 });
    expect(definition.runners).toEqual([{ startPos: BASES.home, playerId: 'batter-1' }]);
    expect(definition.runnerPaths[0]).toEqual([BASES.first, BASES.second, BASES.third, BASES.home]);
  });

  it('creates paths for all occupied bases', () => {
    const definition = editorDefinition().getDefinition(
      { value: 'grounder' },
      { value: 'left_infield' },
      { value: '2' },
      { value: 'batter-2' },
    );

    expect(definition.runners).toHaveLength(4);
    expect(definition.runners.map(runner => runner.startPos)).toEqual([
      BASES.home, BASES.first, BASES.second, BASES.third,
    ]);
    expect(definition.runnerPaths[1]).toEqual([BASES.second, BASES.third, BASES.home]);
    expect(definition.runnerPaths[3]).toEqual([BASES.home]);
  });
});

describe('ScenarioEditor play controls', () => {
  it('randomises each select to a random option', () => {
    const selects = [3, 8, 5].map(count => ({ options: { length: count }, selectedIndex: 0 }));
    vi.spyOn(Math, 'random').mockReturnValue(0.99);
    editorDefinition().randomizeSelections(selects);
    expect(selects.map(select => select.selectedIndex)).toEqual([2, 7, 4]);
    Math.random.mockReturnValue(0);
    editorDefinition().randomizeSelections(selects);
    expect(selects.map(select => select.selectedIndex)).toEqual([0, 0, 0]);
    vi.restoreAllMocks();
  });
});
