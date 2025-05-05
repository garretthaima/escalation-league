import React from 'react';

const Rules = () => {
    return (
        <div className="container mt-4">
            <h1 className="text-center mb-4">Escalation League Rules</h1>

            <section className="mb-4">
                <h2>League Entry</h2>
                <p>
                    The cost for the league is <strong>$30</strong>, with the chance to win prizes. Payment is due during your first attendance at an Escalation League (EL) night where you play an EL game. Payments can be made in cash or via Venmo to the league commissioner. See the <strong>Prize Support</strong> section for more details.
                </p>
            </section>

            <section className="mb-4">
                <h2>Deck Rules</h2>
                <ul>
                    <li>
                        The deck cost for entry cannot exceed <strong>$60</strong> and cannot have a commander from the banned commander list. See the banned commanders at the bottom of this document. All other banned cards follow the official Commander ban list: <a href="https://magic.wizards.com/en/banned-restricted-list" target="_blank" rel="noopener noreferrer">Commander Ban List</a>.
                    </li>
                    <li>
                        You can lock your deck in at any point before the season starts. Locking a deck consists of taking a screenshot of just the cost of the deck. Decklists will be posted the day the season starts and cannot be modified after <strong>12 PM</strong> on that day.
                    </li>
                    <li>
                        Each new week, you can add <strong>$15</strong> worth of cards to your deck based on TCG Market low pricing. Unused budget can be saved and accumulated week over week.
                    </li>
                    <li>
                        Commanders can be switched to a non-banned commander at any point by purchasing the card with the budget you have accumulated.
                    </li>
                    <li>
                        Color-only printed proxies are allowed.
                    </li>
                </ul>
            </section>

            <section className="mb-4">
                <h2>Season Rules</h2>
                <ul>
                    <li>The league season lasts <strong>16 weeks</strong>.</li>
                    <li>To qualify for the final tournament, you need at least <strong>6 wins</strong>.</li>
                    <li>For a game to count, you need at least <strong>3 players</strong> in a pod.</li>
                </ul>
            </section>

            <section className="mb-4">
                <h2>Final Tournament</h2>
                <p>
                    The final tournament consists of <strong>4 rounds</strong>, and the final 4 players with the most points/wins will play one final single-elimination game.
                </p>
                <ul>
                    <li>Games will be timed at <strong>120 minutes</strong>.</li>
                    <li>Tiebreakers are decided by the win rate from the season.</li>
                    <li>Wins are worth <strong>3 points</strong>, and a draw is worth <strong>1 point</strong>.</li>
                </ul>
            </section>

            <section className="mb-4">
                <h2>Prize Support</h2>
                <p>
                    All prize support is based on the budget for the season and the discretion of the league commissioner.
                </p>
                <ul>
                    <li>The winner of the league receives <strong>1 set box</strong> of the commissioner’s choice.</li>
                    <li>2nd to 4th place split <strong>1 set box</strong> of the commissioner’s choice.</li>
                    <li>The following categories are voted on by all players in the season:
                        <ul>
                            <li><strong>League’s MVP</strong></li>
                            <li><strong>Coolest Deck</strong></li>
                            <li><strong>Deck You Hate the Most</strong></li>
                            <li><strong>Most Improved Player</strong></li>
                            <li><strong>Player with the Highest Win Rate Outside of the Final Tournament</strong></li>
                        </ul>
                    </li>
                </ul>
            </section>

            <section className="mb-4">
                <h2>Banned Commanders</h2>
                <p>
                    The banned commander list will be provided by the league commissioner. Please refer to the official league documentation for the most up-to-date list.
                </p>
            </section>
        </div>
    );
};

export default Rules;