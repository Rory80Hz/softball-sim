import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultTeam } from '../src/models/Team.js';
import { createStore, loadTeams, saveTeams } from '../src/store.js';

const storageKey = 'slowpitch-sim:teams:v1';

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('team persistence', () => {
  it('seeds the two default teams when storage is empty', () => {
    const teams = loadTeams();

    expect(teams.map(team => team.name)).toEqual(['Home Sluggers', 'Away Thunder']);
    expect(teams.every(team => team.players.length === 10)).toBe(true);
  });

  it('falls back to defaults for malformed or invalid storage', () => {
    localStorage.setItem(storageKey, '{bad json');
    expect(loadTeams()).toHaveLength(2);

    localStorage.setItem(storageKey, JSON.stringify({ teams: [] }));
    expect(loadTeams()).toHaveLength(2);
  });

  it('merges current attributes and migrates legacy throwSpeed', () => {
    const team = createDefaultTeam('Saved');
    team.players[0].attributes = { speed: 88, throwSpeed: 73 };
    saveTeams([team]);

    const player = loadTeams()[0].players[0];
    expect(player.attributes.speed).toBe(88);
    expect(player.attributes.throwingTechnique).toBe(73);
    expect(player.attributes.battingPower).toBe(55);
  });

  it('persists updates and notifies subscribers', () => {
    const store = createStore();
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.update(teams => { teams[0].name = 'Changed'; });

    expect(listener).toHaveBeenCalledWith(store.getTeams());
    expect(JSON.parse(localStorage.getItem(storageKey))[0].name).toBe('Changed');
    unsubscribe();
    store.update(teams => { teams[0].name = 'Changed again'; });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
