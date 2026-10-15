import { describe, expect, it } from 'vitest';
import { HELP_SECTIONS } from '../src/ui/HelpDialog.js';
import { ALL_POSITIONS } from '../src/constants.js';

describe('help content', () => {
  it('explains every field position', () => {
    const positions = HELP_SECTIONS.find(s => s.id === 'positions').html;
    ALL_POSITIONS.forEach(position => expect(positions).toContain(`<b>${position}`.replace('<b>', '')));
  });

  it('defines SF as Short Fielder', () => {
    expect(HELP_SECTIONS[0].html).toContain('Short Fielder');
  });
});
