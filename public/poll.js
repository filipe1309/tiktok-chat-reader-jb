/**
 * TikTok LIVE Poll System
 * Allows viewers to vote by typing numbers in chat
 */

// Backend URL configuration
let backendUrl = location.protocol === 'file:' ? "https://tiktok-chat-reader.zerody.one/" : undefined;
let connection = new TikTokIOConnection(backendUrl);

// Poll State
let pollState = {
    isRunning: false,
    options: [],
    votes: {},           // { optionNumber: voteCount }
    voters: new Set(),   // Track who has already voted (by uniqueId)
    timer: 30,
    timeLeft: 0,
    timerInterval: null,
    question: ''
};

// Default settings
const DEFAULT_NUM_OPTIONS = 4;
const DEFAULT_TIMER = 30;

$(document).ready(() => {
    // Initialize connection handlers
    $('#connectButton').click(connect);
    $('#uniqueIdInput').on('keyup', function(e) {
        if (e.key === 'Enter') {
            connect();
        }
    });

    // Initialize poll controls
    $('#updateOptionsBtn').click(updateOptionsFields);
    $('#startPollBtn').click(startPoll);
    $('#stopPollBtn').click(stopPoll);
    $('#resetPollBtn').click(resetPoll);
    $('#clearLogBtn').click(clearVoteLog);

    // Auto-update options when number changes
    $('#numOptions').on('change input', updateOptionsFields);

    // Initialize options fields
    updateOptionsFields();
    
    // Initialize results display
    updateResultsDisplay();

    // Setup chat message listener for votes
    setupChatListener();
});

/**
 * Connect to TikTok Live
 */
function connect() {
    let uniqueId = $('#uniqueIdInput').val();
    if (uniqueId !== '') {
        $('#connectionStatus')
            .text('Connecting...')
            .removeClass('status-disconnected status-connected')
            .addClass('status-connecting');

        connection.connect(uniqueId, {
            enableExtendedGiftInfo: false
        }).then(state => {
            $('#connectionStatus')
                .text('Connected')
                .removeClass('status-disconnected status-connecting')
                .addClass('status-connected');
            
            $('#startPollBtn').prop('disabled', false);
            
            console.log(`Connected to roomId ${state.roomId}`);

        }).catch(errorMessage => {
            $('#connectionStatus')
                .text('Failed: ' + errorMessage)
                .removeClass('status-connected status-connecting')
                .addClass('status-disconnected');
            
            console.error('Connection failed:', errorMessage);
        });

    } else {
        alert('Please enter a username');
    }
}

/**
 * Setup listener for chat messages to detect votes
 */
function setupChatListener() {
    connection.on('chat', (data) => {
        if (!pollState.isRunning) return;

        const message = data.comment.trim();
        
        // Check if message is a valid vote (number)
        const voteNumber = parseInt(message);
        
        if (!isNaN(voteNumber) && voteNumber >= 1 && voteNumber <= pollState.options.length) {
            processVote(data, voteNumber);
        }
    });
}

/**
 * Process a vote from a user
 */
function processVote(data, optionNumber) {
    const uniqueId = data.uniqueId;
    
    // Check if user has already voted
    if (pollState.voters.has(uniqueId)) {
        console.log(`User ${uniqueId} has already voted`);
        return;
    }

    // Register vote
    pollState.voters.add(uniqueId);
    pollState.votes[optionNumber] = (pollState.votes[optionNumber] || 0) + 1;

    // Log the vote
    addVoteLog(data, optionNumber);

    // Update display
    updateResultsDisplay();
}

/**
 * Add entry to vote log
 */
function addVoteLog(data, optionNumber) {
    if (!$('#showVoteLogs').is(':checked')) return;

    const logContainer = $('#voteLog');
    const optionText = pollState.options[optionNumber - 1] || optionNumber;
    const time = new Date().toLocaleTimeString();

    const logEntry = `
        <div class="vote-log-item">
            <img src="${data.profilePictureUrl}" alt="">
            <span class="username">@${sanitize(data.uniqueId)}</span>
            <span>voted for</span>
            <span class="vote-option">${optionNumber}. ${sanitize(optionText)}</span>
            <span class="vote-time">${time}</span>
        </div>
    `;

    logContainer.prepend(logEntry);

    // Limit log entries
    if (logContainer.find('.vote-log-item').length > 100) {
        logContainer.find('.vote-log-item').slice(100).remove();
    }
}

/**
 * Clear vote log
 */
function clearVoteLog() {
    $('#voteLog').empty();
}

/**
 * Update the options input fields based on number of options
 */
function updateOptionsFields() {
    const numOptions = parseInt($('#numOptions').val()) || DEFAULT_NUM_OPTIONS;
    const container = $('#optionsContainer');
    
    // Save current values
    const currentValues = [];
    container.find('.option-input').each(function(i) {
        currentValues[i] = $(this).val();
    });

    container.empty();

    for (let i = 1; i <= numOptions; i++) {
        const defaultValue = currentValues[i - 1] || i.toString();
        container.append(`
            <div class="option-item">
                <span class="option-number">${i}</span>
                <input type="text" class="option-input" id="option${i}" placeholder="Option ${i}" value="${sanitize(defaultValue)}">
            </div>
        `);
    }

    updateResultsDisplay();
}

/**
 * Start the poll
 */
function startPoll() {
    // Get configuration
    const numOptions = parseInt($('#numOptions').val()) || DEFAULT_NUM_OPTIONS;
    const timer = parseInt($('#pollTimer').val()) || DEFAULT_TIMER;
    const question = $('#pollQuestion').val() || 'Vote now!';

    // Collect options text
    const options = [];
    for (let i = 1; i <= numOptions; i++) {
        const optionText = $(`#option${i}`).val() || i.toString();
        options.push(optionText);
    }

    // Initialize poll state
    pollState.isRunning = true;
    pollState.options = options;
    pollState.votes = {};
    pollState.voters = new Set();
    pollState.timer = timer;
    pollState.timeLeft = timer;
    pollState.question = question;

    // Initialize votes counter for each option
    for (let i = 1; i <= numOptions; i++) {
        pollState.votes[i] = 0;
    }

    // Update UI
    $('#startPollBtn').prop('disabled', true);
    $('#stopPollBtn').prop('disabled', false);
    $('#pollState').text('Running').removeClass('state-idle state-finished').addClass('state-running');
    $('#pollQuestion-display').text(question);

    // Disable configuration inputs during poll
    $('.config-section input, .config-section button').not('#stopPollBtn').prop('disabled', true);

    // Start timer
    updateTimerDisplay();
    pollState.timerInterval = setInterval(() => {
        pollState.timeLeft--;
        updateTimerDisplay();

        if (pollState.timeLeft <= 0) {
            stopPoll();
        }
    }, 1000);

    updateResultsDisplay();
    
    console.log('Poll started:', { options, timer, question });
}

/**
 * Stop the poll
 */
function stopPoll() {
    pollState.isRunning = false;

    // Clear timer
    if (pollState.timerInterval) {
        clearInterval(pollState.timerInterval);
        pollState.timerInterval = null;
    }

    // Update UI
    $('#startPollBtn').prop('disabled', false);
    $('#stopPollBtn').prop('disabled', true);
    $('#pollState').text('Finished').removeClass('state-idle state-running').addClass('state-finished');

    // Re-enable configuration inputs
    $('.config-section input, .config-section button').prop('disabled', false);
    $('#stopPollBtn').prop('disabled', true);

    // Highlight winner
    updateResultsDisplay(true);

    console.log('Poll stopped. Final results:', pollState.votes);
}

/**
 * Reset the poll
 */
function resetPoll() {
    // Stop if running
    if (pollState.isRunning) {
        stopPoll();
    }

    // Reset state
    pollState.votes = {};
    pollState.voters = new Set();
    pollState.timeLeft = parseInt($('#pollTimer').val()) || DEFAULT_TIMER;

    // Reset UI
    $('#pollState').text('Idle').removeClass('state-running state-finished').addClass('state-idle');
    $('#timerValue').text('--').removeClass('timer-warning timer-critical');
    $('#totalVotes').text('0');
    $('#pollQuestion-display').text('');

    // Re-enable start button if connected
    const isConnected = $('#connectionStatus').hasClass('status-connected');
    $('#startPollBtn').prop('disabled', !isConnected);
    $('#stopPollBtn').prop('disabled', true);

    updateResultsDisplay();
    
    console.log('Poll reset');
}

/**
 * Update timer display
 */
function updateTimerDisplay() {
    const timerElement = $('#timerValue');
    timerElement.text(pollState.timeLeft + 's');

    // Add warning classes
    timerElement.removeClass('timer-warning timer-critical');
    if (pollState.timeLeft <= 5) {
        timerElement.addClass('timer-critical');
    } else if (pollState.timeLeft <= 10) {
        timerElement.addClass('timer-warning');
    }
}

/**
 * Update the results display
 */
function updateResultsDisplay(showWinner = false) {
    const container = $('#resultsContainer');
    container.empty();

    const numOptions = pollState.options.length || parseInt($('#numOptions').val()) || DEFAULT_NUM_OPTIONS;
    
    // Calculate total votes
    let totalVotes = 0;
    for (let i = 1; i <= numOptions; i++) {
        totalVotes += pollState.votes[i] || 0;
    }
    $('#totalVotes').text(totalVotes);

    // Find winner (highest votes)
    let maxVotes = 0;
    let winnerIndex = -1;
    if (showWinner && totalVotes > 0) {
        for (let i = 1; i <= numOptions; i++) {
            if ((pollState.votes[i] || 0) > maxVotes) {
                maxVotes = pollState.votes[i];
                winnerIndex = i;
            }
        }
    }

    // Generate result items
    for (let i = 1; i <= numOptions; i++) {
        const optionText = pollState.options[i - 1] || $(`#option${i}`).val() || i.toString();
        const votes = pollState.votes[i] || 0;
        const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : 0;
        const isWinner = showWinner && i === winnerIndex;

        container.append(`
            <div class="result-item ${isWinner ? 'winner' : ''}">
                <div class="result-header">
                    <div class="result-option">
                        <span class="result-number">${i}</span>
                        <span class="result-text">${sanitize(optionText)}</span>
                    </div>
                    <div class="result-stats">
                        <span class="result-votes">${votes} votes</span>
                        <span class="result-percentage">(${percentage}%)</span>
                    </div>
                </div>
                <div class="result-bar-container">
                    <div class="result-bar" style="width: ${percentage}%"></div>
                </div>
            </div>
        `);
    }
}

/**
 * Sanitize text to prevent XSS
 */
function sanitize(text) {
    if (typeof text !== 'string') return text;
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
