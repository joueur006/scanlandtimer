document.addEventListener('DOMContentLoaded', () => {
    // --- STATE MANAGEMENT ---
    let allSessions = [];
    let allSubjects = [];
    let chart;
    let isRunning = false;
    let elapsed = 0;
    let startTime, timerInterval;

    // Pomodoro State
    let pomodoroEnabled = false;
    let pomodoroState = 'work'; // 'work', 'short_break', 'long_break'
    let pomodoroCycle = 0;
    const POMODORO_DURATIONS = {
        work: 25 * 60 * 1000,
        short_break: 5 * 60 * 1000,
        long_break: 15 * 60 * 1000,
    };
    let remainingTime = 0;

    // --- DOM ELEMENTS CACHING ---
    const dom = {
        timerDisplay: document.getElementById('timer'),
        startButton: document.getElementById('startButton'),
        pauseButton: document.getElementById('pauseButton'),
        stopButton: document.getElementById('stopButton'),
        exportButton: document.getElementById('exportButton'),
        importButton: document.getElementById('importButton'),
        resetButton: document.getElementById('resetButton'),
        importFileInput: document.getElementById('importFileInput'),
        subjectSelect: document.getElementById('subjectSelect'),
        chapterSelect: document.getElementById('chapterSelect'),
        newSubjectInput: document.getElementById('newSubjectInput'),
        newChapterInput: document.getElementById('newChapterInput'),
        addSubjectBtn: document.getElementById('addSubjectBtn'),
        notification: document.getElementById('notification'),
        historyBody: document.getElementById('history'),
        historyCards: document.getElementById('historyCards'),
        subjectsList: document.getElementById('subjectsList'),
        totalSemaine: document.getElementById('totalSemaine'),
        moyenneJour: document.getElementById('moyenneJour'),
        topMatiere: document.getElementById('topMatiere'),
        topSubjectsList: document.getElementById('topSubjectsList'),
        chartCanvas: document.getElementById('weeklyChart'),
        chartMode: document.getElementById('chartMode'),
        navButtons: document.querySelectorAll('nav button[data-tab]'),
        tabs: document.querySelectorAll('.panel.tab'),
        pomodoroToggle: document.getElementById('pomodoroToggle'),
        pomodoroStatus: document.getElementById('pomodoro-status'),
    };

    // --- UTILITY FUNCTIONS ---
    const formatHMS = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    const showNotification = (message, type = 'success', duration = 3000) => {
        dom.notification.textContent = message;
        dom.notification.className = `notification ${type}`;
        dom.notification.classList.remove('hidden');
        setTimeout(() => dom.notification.classList.add('hidden'), duration);
    };

    // --- DATA HANDLING ---
    const loadData = () => {
        try {
            allSessions = JSON.parse(localStorage.getItem('sessions') || '[]');
            allSubjects = JSON.parse(localStorage.getItem('subjects') || '[]');
        } catch (e) {
            console.error("Erreur lors du chargement des données:", e);
            showNotification("Erreur de chargement des données.", "error");
        }
    };

    const saveData = (key, data) => {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (e) {
            console.error(`Erreur lors de la sauvegarde de ${key}:`, e);
            showNotification(`Erreur de sauvegarde.`, "error");
        }
    };

    // --- UI RENDERING ---
    const updateAllUI = () => {
        renderSubjectSelects();
        renderSubjectsList();
        renderHistory();
        renderStats();
        renderChart();
    };

    const updatePomodoroUI = () => {
        const statusText = {
            work: `Cycle ${pomodoroCycle + 1}: Au travail !`,
            short_break: 'Pause Courte',
            long_break: 'Pause Longue'
        };
        dom.pomodoroStatus.textContent = pomodoroEnabled ? statusText[pomodoroState] : '';

        document.body.classList.remove('state-work', 'state-break');
        if (pomodoroEnabled) {
            document.body.classList.add(pomodoroState === 'work' ? 'state-work' : 'state-break');
        }
    };

    // ... (other rendering functions remain the same)
    const renderSubjectSelects = () => {
        const currentSubject = dom.subjectSelect.value;
        const currentChapter = dom.chapterSelect.value;
        dom.subjectSelect.innerHTML = '<option value="">-- Aucune matière --</option>';
        allSubjects.forEach(s => {
            const option = new Option(s.name, s.name);
            dom.subjectSelect.add(option);
        });
        dom.subjectSelect.value = currentSubject;
        renderChapterSelect(currentSubject);
        dom.chapterSelect.value = currentChapter;
    };

    const renderChapterSelect = (subjectName) => {
        dom.chapterSelect.innerHTML = '<option value="">-- Chapitre (optionnel) --</option>';
        const subject = allSubjects.find(s => s.name === subjectName);
        if (subject && subject.chapters) {
            subject.chapters.forEach(chap => {
                const option = new Option(chap, chap);
                dom.chapterSelect.add(option);
            });
        }
    };

    const renderSubjectsList = () => {
        dom.subjectsList.innerHTML = '';
        if (allSubjects.length === 0) {
            dom.subjectsList.innerHTML = `<div class="empty-state">Aucune matière ajoutée.</div>`;
            return;
        }
        allSubjects.forEach((subject, index) => {
            const card = document.createElement('div');
            card.className = 'top-card';
            card.innerHTML = `
                <div class="content">
                    <strong>${subject.name}</strong>
                    <div class="chapters">
                        ${(subject.chapters || []).map(c => `<span class="chapter">${c}</span>`).join('')}
                    </div>
                </div>
                <button data-index="${index}" class="warn delete-subject-btn" style="padding: 8px 10px;">X</button>
            `;
            dom.subjectsList.appendChild(card);
        });
    };

    const renderHistory = () => {
        dom.historyBody.innerHTML = '';
        dom.historyCards.innerHTML = '';
        if (allSessions.length === 0) {
            dom.historyBody.innerHTML = `<tr><td colspan="5" class="empty-state">Aucune session.</td></tr>`;
            dom.historyCards.innerHTML = `<div class="empty-state">Aucune session.</div>`;
            return;
        }

        allSessions.slice().reverse().forEach(s => {
            const dateStr = new Date(s.date).toLocaleString('fr-FR');
            const row = `<tr>
                <td>${dateStr}</td>
                <td>${s.matiere || '-'}</td>
                <td>${s.chapitre || '-'}</td>
                <td>${s.duree}</td>
                <td>${s.pauses || '0s'}</td>
            </tr>`;
            const card = `<div class="history-card">
                <div><strong>Matière:</strong> ${s.matiere || '-'}</div>
                <div><strong>Date:</strong> ${dateStr}</div>
                <div><strong>Durée:</strong> ${s.duree}</div>
            </div>`;
            dom.historyBody.innerHTML += row;
            dom.historyCards.innerHTML += card;
        });
    };

    const renderStats = () => {
        const now = new Date();
        const startOfWeek = now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1);
        const firstDay = new Date(now.setDate(startOfWeek));
        firstDay.setHours(0,0,0,0);

        const thisWeekSessions = allSessions.filter(s => new Date(s.date) >= firstDay);
        const totalMsThisWeek = thisWeekSessions.reduce((acc, s) => acc + s.dureeMs, 0);

        dom.totalSemaine.textContent = `${(totalMsThisWeek / 3600000).toFixed(1)} h`;

        const totalDays = Math.max(1, (new Date() - new Date(allSessions[0]?.date || new Date())) / 86400000);
        const totalMs = allSessions.reduce((acc, s) => acc + s.dureeMs, 0);
        dom.moyenneJour.textContent = `${(totalMs / totalDays / 3600000).toFixed(1)} h`;

        const subjectTimes = allSessions.reduce((acc, s) => {
            acc[s.matiere] = (acc[s.matiere] || 0) + s.dureeMs;
            return acc;
        }, {});

        const topSubject = Object.entries(subjectTimes).sort((a,b) => b[1] - a[1])[0];
        dom.topMatiere.textContent = topSubject ? topSubject[0] : '-';
    };

    const renderChart = () => {
        const ctx = dom.chartCanvas.getContext('2d');
        if (chart) chart.destroy();

        const data = {
            labels: [],
            datasets: [{
                label: 'Temps de révision (heures)',
                data: [],
                backgroundColor: 'rgba(79, 70, 229, 0.5)',
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 1
            }]
        };

        const subjectTimes = allSessions.reduce((acc, s) => {
            if (!s.matiere) return acc;
            acc[s.matiere] = (acc[s.matiere] || 0) + s.dureeMs / 3600000;
            return acc;
        }, {});

        data.labels = Object.keys(subjectTimes);
        data.datasets[0].data = Object.values(subjectTimes);

        chart = new Chart(ctx, { type: 'bar', data, options: { scales: { y: { beginAtZero: true } } } });
    };

    // --- POMODORO & TIMER LOGIC ---
    const handlePomodoroTransition = () => {
        clearInterval(timerInterval);
        isRunning = false;

        if (pomodoroState === 'work') {
            const session = {
                date: new Date().toISOString(),
                matiere: dom.subjectSelect.value || 'Pomodoro',
                chapitre: dom.chapterSelect.value,
                duree: formatHMS(POMODORO_DURATIONS.work),
                dureeMs: POMODORO_DURATIONS.work,
                pauses: "0s"
            };
            allSessions.push(session);
            saveData('sessions', allSessions);
            updateAllUI();
            pomodoroCycle++;
        }

        pomodoroState = (pomodoroState === 'work')
            ? ((pomodoroCycle % 4 === 0) ? 'long_break' : 'short_break')
            : 'work';

        const message = pomodoroState === 'work' ? "Au travail !" : (pomodoroState === 'long_break' ? "C'est l'heure d'une longue pause !" : "Petite pause !");
        showNotification(message, 'success');

        startTimer();
    };

    const updateTimerDisplay = () => {
        if (pomodoroEnabled && isRunning) {
            remainingTime -= 1000;
            if (remainingTime < 0) remainingTime = 0;
            dom.timerDisplay.textContent = formatHMS(remainingTime);
            if (remainingTime <= 0) {
                handlePomodoroTransition();
            }
        } else if (!pomodoroEnabled && isRunning) {
            const diff = Date.now() - startTime + elapsed;
            dom.timerDisplay.textContent = formatHMS(diff);
        }
    };

    const startTimer = () => {
        if (isRunning) return;
        isRunning = true;

        if (pomodoroEnabled) {
            remainingTime = POMODORO_DURATIONS[pomodoroState];
            dom.timerDisplay.textContent = formatHMS(remainingTime);
            updatePomodoroUI();
        } else {
            startTime = Date.now();
        }

        timerInterval = setInterval(updateTimerDisplay, 1000);
        updateButtonStates();
        dom.pauseButton.textContent = 'Pause';
    };

    const pauseTimer = () => {
        if (!isRunning) { // Resume
            startTimer();
            return;
        }
        clearInterval(timerInterval);
        if (!pomodoroEnabled) {
             elapsed += Date.now() - startTime;
        }
        isRunning = false;
        updateButtonStates();
        dom.pauseButton.textContent = 'Reprendre';
    };

    const stopTimer = () => {
        clearInterval(timerInterval);
        isRunning = false;

        if (pomodoroEnabled) {
            if (pomodoroState === 'work' && remainingTime < POMODORO_DURATIONS.work) {
                 if (!confirm("Voulez-vous arrêter ce cycle de travail ? La progression ne sera pas sauvegardée.")) {
                    startTimer(); // restart if user cancels
                    return;
                 }
            }
            pomodoroState = 'work';
            pomodoroCycle = 0;
            remainingTime = POMODORO_DURATIONS.work;
            dom.timerDisplay.textContent = formatHMS(remainingTime);
        } else {
            if (elapsed === 0) return;
            const session = {
                date: new Date().toISOString(),
                matiere: dom.subjectSelect.value,
                chapitre: dom.chapterSelect.value,
                duree: formatHMS(elapsed),
                dureeMs: elapsed,
                pauses: "0s"
            };
            allSessions.push(session);
            saveData('sessions', allSessions);
            elapsed = 0;
            dom.timerDisplay.textContent = formatHMS(0);
            updateAllUI();
            showNotification('Session enregistrée !');
        }

        updatePomodoroUI();
        updateButtonStates();
    };

    const updateButtonStates = () => {
        const regularTimerRunning = !pomodoroEnabled && (isRunning || elapsed > 0);
        const pomodoroTimerRunning = pomodoroEnabled && isRunning;

        dom.startButton.disabled = regularTimerRunning || pomodoroTimerRunning;
        dom.pauseButton.disabled = !isRunning;
        dom.stopButton.disabled = !regularTimerRunning && !pomodoroTimerRunning;

        dom.subjectSelect.disabled = pomodoroTimerRunning;
        dom.chapterSelect.disabled = pomodoroTimerRunning;
        dom.pomodoroToggle.disabled = isRunning;
    };

    // --- EVENT LISTENERS ---
    const setupEventListeners = () => {
        dom.startButton.addEventListener('click', startTimer);
        dom.pauseButton.addEventListener('click', pauseTimer);
        dom.stopButton.addEventListener('click', stopTimer);

        dom.pomodoroToggle.addEventListener('change', (e) => {
            pomodoroEnabled = e.target.checked;
            clearInterval(timerInterval);
            isRunning = false;
            elapsed = 0;

            if (pomodoroEnabled) {
                pomodoroState = 'work';
                pomodoroCycle = 0;
                remainingTime = POMODORO_DURATIONS.work;
                dom.timerDisplay.textContent = formatHMS(remainingTime);
            } else {
                remainingTime = 0;
                dom.timerDisplay.textContent = formatHMS(0);
            }
            updatePomodoroUI();
            updateButtonStates();
        });

        // ... (other event listeners)
        dom.addSubjectBtn.addEventListener('click', () => {
            const name = dom.newSubjectInput.value.trim();
            const chapter = dom.newChapterInput.value.trim();
            if (!name) {
                showNotification('Le nom de la matière est requis.', 'error');
                return;
            }
            let subject = allSubjects.find(s => s.name === name);
            if (!subject) {
                subject = { name, chapters: [] };
                allSubjects.push(subject);
            }
            if (chapter && !subject.chapters.includes(chapter)) {
                subject.chapters.push(chapter);
            }
            saveData('subjects', allSubjects);
            updateAllUI();
            dom.newSubjectInput.value = '';
            dom.newChapterInput.value = '';
            showNotification('Matière/Chapitre ajouté.');
        });

        dom.subjectSelect.addEventListener('change', (e) => renderChapterSelect(e.target.value));

        dom.subjectsList.addEventListener('click', (e) => {
            if (e.target.classList.contains('delete-subject-btn')) {
                const index = e.target.dataset.index;
                if (confirm(`Supprimer la matière "${allSubjects[index].name}" ?`)) {
                    allSubjects.splice(index, 1);
                    saveData('subjects', allSubjects);
                    updateAllUI();
                    showNotification('Matière supprimée.', 'success');
                }
            }
        });

        dom.navButtons.forEach(button => {
            button.addEventListener('click', () => {
                const tabId = button.dataset.tab;
                dom.tabs.forEach(tab => tab.style.display = tab.id === tabId ? 'block' : 'none');
                dom.navButtons.forEach(btn => {
                    btn.setAttribute('aria-selected', btn.dataset.tab === tabId);
                    btn.classList.toggle('active', btn.dataset.tab === tabId);
                });
            });
        });

        dom.resetButton.addEventListener('click', () => {
            if (confirm('Voulez-vous vraiment tout réinitialiser ? Cette action est irréversible.')) {
                localStorage.clear();
                allSessions = [];
                allSubjects = [];
                elapsed = 0;
                if(isRunning) clearInterval(timerInterval);
                isRunning = false;
                pomodoroEnabled = false;
                dom.pomodoroToggle.checked = false;
                updateTimerDisplay();
                updateButtonStates();
                updateAllUI();
                updatePomodoroUI();
                showNotification('Données réinitialisées.', 'success');
            }
        });

        dom.exportButton.addEventListener('click', () => {
            const dataStr = JSON.stringify({ exportedAt: new Date(), sessions: allSessions, subjects: allSubjects });
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `scanland_timer_backup_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showNotification('Données exportées.', 'success');
        });

        dom.importButton.addEventListener('click', () => dom.importFileInput.click());
        dom.importFileInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (confirm("Remplacer les données existantes ? (Annuler pour fusionner)")) {
                        allSessions = data.sessions || [];
                        allSubjects = data.subjects || [];
                    } else {
                        // Simple merge logic
                        allSessions.push(...(data.sessions || []));
                        allSubjects.push(...(data.subjects || []));
                    }
                    saveData('sessions', allSessions);
                    saveData('subjects', allSubjects);
                    updateAllUI();
                    showNotification('Données importées avec succès.', 'success');
                } catch (err) {
                    showNotification("Échec de l'importation. Fichier invalide.", 'error');
                    console.error(err);
                } finally {
                    dom.importFileInput.value = ''; // Reset file input
                }
            };
            reader.readAsText(file);
        });
    };

    // --- INITIALIZATION ---
    const init = () => {
        loadData();
        setupEventListeners();
        updateButtonStates();
        document.querySelector('nav button[data-tab="timerTab"]').click();
        updateAllUI();
        updatePomodoroUI();
        dom.timerDisplay.textContent = formatHMS(0);
    };

    init();
});