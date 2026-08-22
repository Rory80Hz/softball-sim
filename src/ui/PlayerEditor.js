import { clampAttribute } from '../models/Player.js';

const ATTRIBUTE_FIELDS = [
    ['speed', 'Movement speed'],
    ['throwingTechnique', 'Throwing technique'],
    ['throwAccuracy', 'Throw accuracy'],
    ['armStrength', 'Arm strength'],
    ['catchAccuracy', 'Catch / stop accuracy'],
    ['battingContact', 'Batting contact'],
    ['battingPower', 'Batting power'],
];

export class PlayerEditor {
    constructor(store, container) {
        this.store = store;
        this.container = container;
        this.selectedTeam = 0;
        this.selectedPlayer = 0;
        this.isOpen = true;
        this.render();
    }

    render() {
        const teams = this.store.getTeams();
        const team = teams[this.selectedTeam];
        const player = team?.players[this.selectedPlayer];
        if (!team || !player) return;

        this.container.innerHTML = `
            <details class="panel player-config" ${this.isOpen ? 'open' : ''}>
                <summary>Player Config</summary>
                <label for="config-team">Team</label>
                <select id="config-team">
                    ${teams.map((item, index) => `<option value="${index}" ${index === this.selectedTeam ? 'selected' : ''}>${item.name}</option>`).join('')}
                </select>
                <label for="config-player">Player</label>
                <select id="config-player">
                    ${team.players.map((item, index) => `<option value="${index}" ${index === this.selectedPlayer ? 'selected' : ''}>${item.name} (${item.position})</option>`).join('')}
                </select>
                <label for="config-name">Name</label>
                <input id="config-name" type="text" value="${player.name}" />
                <label for="config-number">Player number</label>
                <input id="config-number" type="number" min="0" max="99" value="${player.number ?? player.battingOrder}" />
                <div class="attribute-grid">
                    ${ATTRIBUTE_FIELDS.map(([key, label]) => `
                        <label for="config-${key}">${label}
                            <output id="value-${key}">${player.attributes[key]}</output>
                        </label>
                        <input id="config-${key}" type="range" min="1" max="100" value="${player.attributes[key]}" />
                    `).join('')}
                </div>
            </details>
        `;

        this.container.querySelector('.player-config').addEventListener('toggle', event => {
            this.isOpen = event.target.open;
        });

        this.container.querySelector('#config-team').addEventListener('change', event => {
            this.selectedTeam = Number(event.target.value);
            this.selectedPlayer = 0;
            this.render();
        });
        this.container.querySelector('#config-player').addEventListener('change', event => {
            this.selectedPlayer = Number(event.target.value);
            this.render();
        });
        this.container.querySelector('#config-name').addEventListener('change', event => {
            this.store.update(currentTeams => {
                currentTeams[this.selectedTeam].players[this.selectedPlayer].name = event.target.value.trim() || player.name;
            });
        });
        this.container.querySelector('#config-number').addEventListener('change', event => {
            this.store.update(currentTeams => {
                currentTeams[this.selectedTeam].players[this.selectedPlayer].number = Math.max(0, Math.min(99, Number(event.target.value) || 0));
            });
        });
        ATTRIBUTE_FIELDS.forEach(([key]) => {
            this.container.querySelector(`#config-${key}`).addEventListener('input', event => {
                const value = clampAttribute(event.target.value);
                event.target.value = value;
                this.container.querySelector(`#value-${key}`).textContent = value;
                this.store.update(currentTeams => {
                    currentTeams[this.selectedTeam].players[this.selectedPlayer].attributes[key] = value;
                });
            });
        });
    }
}
