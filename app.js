document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let allSessions = [];
    let allSubjects = [];
    let chart;

    // Timer state
    let startTime, timerInterval;
    let elapsed = 0;
    let isRunning = false;

    // --- DOM ELEMENTS ---
    const timerDisplay = document.getElementById('timer');
    const startButton = document.getElementById('startButton');
    const pauseButton = document.getElementById('pauseButton');
    const stopButton = document.getElementById('stopButton');
    // ... (Get all other necessary DOM elements here to avoid repeated queries)

    // --- UTILITY FUNCTIONS ---
    const formatHMS = (ms) => {
        const s = Math.floor(ms / 1000);
        const hh = Math.floor(s / 3600).toString().padStart(2, '0');
        const mm = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
        const ss = (s % 60).toString().padStart(2, '0');
        return `${hh}:${mm}:${ss}`;
    };

    const getSessionDurationInSeconds = (session) => {
        if (session.dureeMs) {
            return Math.round(session.dureeMs / 1000);
        }
        const parts = session.duree.split(':');
        return (+parts[0]) * 3600 + (+parts[1]) * 60 + (+parts[2]);
    };
    
    const showNotification = (message, type = 'success') => {
        const notification = document.getElementById('notification');
        notification.textContent = message;
        notification.className = `notification ${type}`;
        setTimeout(() => {
            notification.classList.add('hidden');
        }, 3000);
    };

    // --- DATA HANDLING ---
    const loadDataFromStorage = () => {
        allSessions = JSON.parse(localStorage.getItem('sessions') || '[]');
        allSubjects = JSON.parse(localStorage.getItem('subjects') || '[]');
    };

    const saveSessionsToStorage = () => {
        localStorage.setItem('sessions', JSON.stringify(allSessions));
    };

    const saveSubjectsToStorage = () => {
        localStorage.setItem('subjects', JSON.stringify(allSubjects));
    };


    // --- UI RENDERING ---
    const updateAllUI = () => {
        // This function calls all rendering functions.
        // It's a single point of update after data changes.
        populateSubjectAndChapterSelects();
        renderSubjectsList();
        afficherHistorique();
        updateStats();
        updateChart();
    };
    
    const afficherHistorique = () => {
        const tbody = document.getElementById('history');
        tbody.innerHTML = '';
        if (allSessions.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty-state">Aucune session enregistrée pour le moment.</td></tr>`;
            return;
        }
        // ... (The rest of your 'afficherHistorique' logic goes here, but using 'allSessions' array)
        // For brevity, I'll keep the logic, but remember to replace 'history' with 'allSessions'
        const history = allSessions;
        history.slice().reverse().forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${new Date(s.date).toLocaleString()}</td><td>${s.matiere || '-'}</td><td>${s.chapitre || '-'}</td><td>${s.duree}</td><td>${s.pauses || '0s'}</td>`;
            tbody.appendChild(tr);
        });
    };
    
    const renderSubjectsList = () => {
        const container = document.getElementById('subjectsList');
        container.innerHTML = '';
        if (allSubjects.length === 0) {
            container.innerHTML = `<div class="empty-state">Aucune matière ajoutée.</div>`;
            return;
        }
        allSubjects.forEach((s, i) => {
            // ... (Your 'renderSubjectsList' logic, but using 'allSubjects' array)
            const div = document.createElement('div');
            div.style.display='flex';
            div.innerHTML = `<div><strong>${s.name}</strong></div>`; // Simplified for brevity
            container.appendChild(div);
        });
    };
    
    const populateSubjectAndChapterSelects = () => {
        // ... (Your logic, using 'allSubjects')
    };

    const updateStats = () => {
        // ... (Your logic, using 'allSessions')
    };
    
    const updateChart = () => {
        // ... (Your logic, using 'allSessions')
    };
    

    // --- TIMER LOGIC ---
    const updateTimerDisplay = () => {
        const now = Date.now();
        const diff = isRunning ? (now - startTime + elapsed) : elapsed;
        timerDisplay.textContent = formatHMS(diff);
    };

    const startTimer = () => {
        if (isRunning) return;
        isRunning = true;
        startTime = Date.now();
        timerInterval = setInterval(updateTimerDisplay, 1000);
        updateButtonStates();
    };

    const pauseTimer = () => {
        if (!isRunning) { // This is now a resume action
             startTimer();
             pauseButton.textContent = 'Pause';
             return;
        }
        clearInterval(timerInterval);
        elapsed += Date.now() - startTime;
        isRunning = false;
        pauseButton.textContent = 'Reprendre';
        updateButtonStates();
    };

    const stopTimer = () => {
        if (isRunning) {
            clearInterval(timerInterval);
            elapsed += Date.now() - startTime;
        }
        isRunning = false;

        const session = {
            date: new Date().toISOString(),
            matiere: document.getElementById('subjectSelect').value || '',
            chapitre: document.getElementById('chapterSelect').value || '',
            duree: formatHMS(elapsed),
            dureeMs: elapsed
        };
        allSessions.push(session);
        saveSessionsToStorage();

        // Reset timer
        elapsed = 0;
        updateTimerDisplay();
        updateButtonStates();
        updateAllUI(); // Refresh everything
        showNotification('Session enregistrée !');
    };

    const updateButtonStates = () => {
        startButton.disabled = isRunning || elapsed > 0;
        pauseButton.disabled = !isRunning && elapsed === 0;
        stopButton.disabled = !isRunning && elapsed === 0;
    };


    // --- EVENT LISTENERS ---
    const setupEventListeners = () => {
        startButton.addEventListener('click', startTimer);
        pauseButton.addEventListener('click', pauseTimer);
        stopButton.addEventListener('click', stopTimer);
        
        document.getElementById('addSubjectBtn').addEventListener('click', () => {
             const name = document.getElementById('newSubjectInput').value.trim();
             if(!name) {
                 showNotification('Le nom de la matière ne peut pas être vide.', 'error');
                 return;
             }
             allSubjects.push({ name: name, chapters: [] });
             saveSubjectsToStorage();
             updateAllUI();
             showNotification('Matière ajoutée avec succès.');
             document.getElementById('newSubjectInput').value = '';
        });
        
        // Add listeners for nav buttons to switch tabs
        document.querySelectorAll('nav button[data-tab]').forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.getAttribute('data-tab');
                showTab(tabId);
            });
        });
        
        // ... Add all other event listeners here (import, export, reset, etc.)
    };
    
    const showTab = (tabId) => {
        document.querySelectorAll('.tab').forEach(t => t.style.display = 'none');
        document.getElementById(tabId).style.display = 'block';

        document.querySelectorAll('nav button[data-tab]').forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-tab') === tabId);
        });
    };

    // --- INITIALIZATION ---
    const init = () => {
        loadDataFromStorage();
        setupEventListeners();
        updateButtonStates();
        showTab('timerTab'); // Show the main tab by default
        updateAllUI();
    };

    init(); // Start the application
});
