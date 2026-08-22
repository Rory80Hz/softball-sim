import { createDefaultTeam } from './models/Team.js';
import { DEFAULT_ATTRIBUTES } from './models/Player.js';

const STORAGE_KEY = 'slowpitch-sim:teams:v1';

function seedTeams() {
  return [createDefaultTeam('Home Sluggers'), createDefaultTeam('Away Thunder')];
}

export function loadTeams() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedTeams();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return seedTeams();
    return parsed.map(team => ({
      ...team,
      players: (team.players || []).map(player => ({
        ...player,
        number: player.number || player.battingOrder || 1,
        attributes: {
          ...DEFAULT_ATTRIBUTES,
          ...(player.attributes || {}),
          throwingTechnique: player.attributes?.throwingTechnique
            ?? player.attributes?.throwSpeed
            ?? DEFAULT_ATTRIBUTES.throwingTechnique,
        },
      })),
    }));
  } catch (e) {
    console.warn('Failed to load teams, reseeding defaults.', e);
    return seedTeams();
  }
}

export function saveTeams(teams) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(teams));
}

// A tiny observable store so every view (roster editor, scenario editor,
// play view) reacts to the same shared state.
export function createStore() {
  let teams = loadTeams();
  const listeners = new Set();

  function notify() {
    saveTeams(teams);
    listeners.forEach((fn) => fn(teams));
  }

  return {
    getTeams: () => teams,
    setTeams(next) {
      teams = next;
      notify();
    },
    update(fn) {
      fn(teams);
      notify();
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
