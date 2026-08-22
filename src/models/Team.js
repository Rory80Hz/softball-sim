import { createPlayer, nextId } from './Player.js';
import { ALL_POSITIONS } from '../constants.js';

export function createTeam(name = 'New Team') {
  return { id: nextId('team'), name, players: [] };
}

// Builds a full, sensibly-named 10-player slow-pitch roster so a new team
// starts in a usable state.
export function createDefaultTeam(name) {
  const team = createTeam(name);
  const positions = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'SF'];
  positions.forEach((position, i) => {
    team.players.push(
      createPlayer({
        name: `${name} Player ${i + 1}`,
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
