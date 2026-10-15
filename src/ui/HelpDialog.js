export const HELP_SECTIONS = [
  {
    id: 'positions',
    title: 'Field positions',
    html: `
      <ul>
        <li><b>P</b> - Pitcher: lobs the ball in an arc to the plate, covers home on plays there.</li>
        <li><b>C</b> - Catcher: covers home plate and takes throws for plays at the plate.</li>
        <li><b>1B / 2B / 3B</b> - First, second and third basemen: field balls near their base and cover it.</li>
        <li><b>SS</b> - Shortstop: between second and third; shares second-base coverage with 2B depending on where the ball is hit.</li>
        <li><b>SF</b> - <b>Short Fielder</b>: the extra tenth defender, a "rover" playing shallow, between the infield and outfield. Not used in the four-outfielder layout.</li>
        <li><b>LF / CF / RF</b> - Left, center and right fielders (three-outfielder layout).</li>
        <li><b>LC / RC</b> - Left-center and right-center fielders (four-outfielder layout: LF, LC, RC, RF). The CF player plays LC and the SF player plays RC.</li>
      </ul>`,
  },
  {
    id: 'rules',
    title: 'Slowpitch rules used',
    html: `
      <ul>
        <li>Ten defenders: the usual nine plus a fourth outfielder (SF or a fourth outfield spot).</li>
        <li>The pitch is a slow arc, so the batter hits and runs; there is no stealing or leading off.</li>
        <li><b>Force play:</b> a runner forced to advance is out if a fielder with the ball touches the base first. The batter is forced to first.</li>
        <li><b>Tag play:</b> a runner who is not forced is out if tagged with the ball between bases.</li>
        <li>A fly ball caught before it lands is an out; runners may then advance at their own risk.</li>
        <li>Three outs end the half inning. Play ends when it settles: the ball is held and no runner is advancing.</li>
        <li>Not modelled: tag-ups, sacrifice flies, bunts, infield-fly rule, home runs.</li>
      </ul>`,
  },
  {
    id: 'app',
    title: 'Using the simulator',
    html: `
      <ul>
        <li><b>Play Setup panel</b> (top left): pick hit type, hit location, runners on base, outfield layout and batter. The field updates immediately.</li>
        <li>🥎 <b>Start</b> runs the play. ❚❚ <b>Pause</b> / ▶ <b>Resume</b> freeze and continue it. ↻ <b>Reset</b> reloads the setup.</li>
        <li>🎲 <b>Randomise</b> picks a random hit type, location and runners.</li>
        <li>⏰ <b>Call time</b> ends the play immediately.</li>
        <li><b>Camera:</b> drag to orbit, scroll to zoom, ◆ resets the view.</li>
        <li><b>Player Config</b> (top right): edit each player's name, number, speed, throwing, arm, catching and batting ratings.</li>
      </ul>`,
  },
  {
    id: 'directing',
    title: 'Directing players (while paused)',
    html: `
      <ul>
        <li>Click a <b>defender</b> to select them, then click the <b>ball</b> or a <b>spot on the field</b> to send them there.</li>
        <li>If the selected defender holds the ball, click a <b>teammate</b> to throw. Whether the throw arrives depends on throwing ability.</li>
        <li>Click a <b>runner</b>, then a <b>valid base</b> to send them. Arrows show where players were directed (yellow = fielders, cyan = runners).</li>
        <li>Once a directed player arrives or finishes their action, they go back to automatic behaviour.</li>
        <li>A pale green player had the ball but no longer does.</li>
      </ul>`,
  },
];

export class HelpDialog {
  constructor(parent) {
    this.button = document.createElement('button');
    this.button.className = 'btn icon-btn help-btn';
    this.button.id = 'btn-help';
    this.button.textContent = '?';
    this.button.setAttribute('aria-label', 'Help');
    this.button.title = 'Help: positions, rules and how to use the app';

    this.overlay = document.createElement('div');
    this.overlay.className = 'help-overlay';
    this.overlay.hidden = true;
    this.overlay.innerHTML = `
      <div class="help-dialog panel" role="dialog" aria-modal="true" aria-labelledby="help-title">
        <div class="help-header">
          <h2 id="help-title">Help</h2>
          <button class="btn icon-btn" id="help-close" aria-label="Close help">&times;</button>
        </div>
        <div class="help-body">
          ${HELP_SECTIONS.map(s => `<section id="help-${s.id}"><h3>${s.title}</h3>${s.html}</section>`).join('')}
        </div>
      </div>`;

    this.button.addEventListener('click', () => this.toggle(true));
    this.overlay.addEventListener('click', e => { if (e.target === this.overlay) this.toggle(false); });
    this.overlay.querySelector('#help-close').addEventListener('click', () => this.toggle(false));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !this.overlay.hidden) this.toggle(false);
    });

    parent.appendChild(this.button);
    parent.appendChild(this.overlay);
  }

  toggle(open) {
    this.overlay.hidden = !open;
    if (open) this.overlay.querySelector('#help-close').focus();
    else this.button.focus();
  }
}
