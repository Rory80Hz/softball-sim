import { createPlayer, nextId } from './Player.js';
import { ALL_POSITIONS } from '../constants.js';
import { DEFAULT_PLAYER_CONFIGS } from '../config/player-configs.js';

export function createTeam(name = 'New Team') {
  return { id: nextId('team'), name, players: [] };
}

// Builds a full, sensibly-named 10-player slow-pitch roster so a new team
// starts in a usable state.
export function createDefaultTeam(name) {
  const team = createTeam(name);
  const configs = DEFAULT_PLAYER_CONFIGS[name] || [
    ['Player 1', 'P'], ['Player 2', 'C'], ['Player 3', '1B'], ['Player 4', '2B'], ['Player 5', '3B'],
    ['Player 6', 'SS'], ['Player 7', 'LF'], ['Player 8', 'CF'], ['Player 9', 'RF'], ['Player 10', 'SF'],
  ];
  configs.forEach(([playerName, position], i) => {
    team.players.push(
      createPlayer({
        name: `${name} ${playerName}`,
        position,
        battingOrder: i + 1,
      })
    );
  });
  return team;
}

export function nextBattingOrder(team) {
  const used = new Set(team.players.map((p) => p.battingOrder));
  let n = 1;
  while (used.has(n)) n++;
  return n;
}

export function unusedPosition(team) {
  const used = new Set(team.players.map((p) => p.position));
  return ALL_POSITIONS.find((p) => !used.has(p)) || ALL_POSITIONS[0];
}
