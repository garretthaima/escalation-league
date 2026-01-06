import React from 'react';

const Rules = () => {
    return (
        <div className="container mt-4">
            <h1 className="text-center mb-4">Escalation League Rules</h1>

            <section className="mb-4">
                <h2>League Entry</h2>
                <p>
                    <strong>Entry Fee:</strong> $30
                </p>
                <p>
                    Payment is due during your first EL game night. Accepted payment methods: Cash or Venmo to the league commissioner.
                </p>
            </section>

            <section className="mb-4">
                <h2>Deck Requirements</h2>
                <ul>
                    <li><strong>Starting Budget:</strong> Maximum $75 (TCG Market low pricing)</li>
                    <li><strong>Basic Lands:</strong> Do not count toward budget</li>
                    <li><strong>Banned Commanders:</strong> See list at bottom of page</li>
                    <li><strong>Banned Cards:</strong> Follow official <a href="https://magic.wizards.com/en/banned-restricted-list" target="_blank" rel="noopener noreferrer">Commander Ban List</a></li>
                    <li><strong>Proxies:</strong> Color-only printed proxies are allowed</li>
                </ul>
            </section>

            <section className="mb-4">
                <h2>Deck Lock-In Process</h2>
                <ul>
                    <li>Lock in your deck anytime before the season starts by taking a cost screenshot</li>
                    <li>Decklists are posted on season start day and cannot be modified after <strong>12 PM</strong></li>
                    <li>Update your decklist weekly before your first game of the week</li>
                    <li>Decklist links must remain accessible to the group for the entire season</li>
                    <li><strong>Tip:</strong> Use Moxfield's "Update to lowest pricing" option</li>
                </ul>
            </section>

            <section className="mb-4">
                <h2>Weekly Budget</h2>
                <ul>
                    <li>Add <strong>$11</strong> worth of cards each week (TCG Market low pricing)</li>
                    <li>Unused budget accumulates week over week</li>
                    <li>Commanders can be switched anytime using accumulated budget</li>
                </ul>
            </section>

            <section className="mb-4">
                <h2>Season Structure</h2>
                <ul>
                    <li><strong>Duration:</strong> 16 weeks</li>
                    <li><strong>Week Schedule:</strong> Thursday through Wednesday</li>
                    <li>Non-Thursday games can be arranged with provisions</li>
                    <li><strong>Minimum Pod Size:</strong> 3 players for game to count</li>
                    <li><strong>Certification:</strong> All players must certify a game for points to be distributed</li>
                </ul>
            </section>

            <section className="mb-4">
                <h2>Scoring System</h2>
                <ul>
                    <li><strong>Win:</strong> 4 points</li>
                    <li><strong>Non-Win Game:</strong> 1 point</li>
                    <li><strong>Scoop:</strong> 0 points</li>
                </ul>
            </section>

            <section className="mb-4">
                <h2>Playoff Qualification</h2>
                <ul>
                    <li>Top <strong>75%</strong> of players by total points qualify</li>
                    <li>Odd numbers round up (adds one extra player)</li>
                    <li><strong>Tiebreaker Order:</strong> Points → Win Rate → Games Won → Games Played → Arm Wrestle</li>
                </ul>
            </section>

            <section className="mb-4">
                <h2>Final Tournament</h2>
                <ul>
                    <li><strong>Format:</strong> 4 rounds</li>
                    <li><strong>Championship:</strong> Top 4 players by points/wins play single elimination</li>
                    <li><strong>Scoring:</strong> Win = 4 points, Non-Win = 1 point, Scoop = 0 points</li>
                    <li><strong>Tiebreaker Order:</strong> Points → Win Rate → Games Won → Games Played → Arm Wrestle</li>
                </ul>
            </section>

            <section className="mb-4">
                <h2>Prize Support</h2>
                <p className="text-muted small">
                    <em>All prizes subject to season budget and commissioner discretion</em>
                </p>
                
                <h5 className="mt-3">Placement Prizes</h5>
                <ul>
                    <li><strong>1st Place:</strong> 1 Set Box (commissioner's choice)</li>
                    <li><strong>2nd-4th Place:</strong> Split 1 Set Box (commissioner's choice)</li>
                </ul>

                <h5 className="mt-3">Voted Awards</h5>
                <p>All players vote on the following categories:</p>
                <ul>
                    <li>League's MVP</li>
                    <li>Coolest Deck</li>
                    <li>Deck You Hate the Most</li>
                    <li>Most Improved Player</li>
                    <li>Highest Win Rate (outside final tournament)</li>
                </ul>
            </section>

            <section className="mb-4">
                <h2>Banned Commanders</h2>
                <p className="text-muted">
                    <em>The banned commander list will be provided by the league commissioner. Please refer to official league documentation for the current list.</em>
                </p>
            </section>
        </div>
    );
};

export default Rules;
