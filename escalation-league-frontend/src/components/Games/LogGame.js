import React, { useState } from 'react';
import CreatePod from './CreatePod';
import PodList from './PodList';
import LogPodResult from './LogPodResult';

const GameLoggingPage = () => {
    const [selectedPodId, setSelectedPodId] = useState(null);

    return (
        <div>
            <h1>Game Logging</h1>
            <CreatePod onPodCreated={(pod) => alert(`Pod #${pod.id} created!`)} />
            <PodList />
            {selectedPodId && <LogPodResult podId={selectedPodId} />}
        </div>
    );
};

export default GameLoggingPage;