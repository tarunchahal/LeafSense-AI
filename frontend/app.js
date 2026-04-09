const API_BASE = "http://127.0.0.1:8000/api";
let currentUser = null;
let currentPrediction = null;

// --- DOM Elements ---
const screens = {
    auth: document.getElementById('auth-screen'),
    app: document.getElementById('app-screen')
};

const authTabs = {
    login: { btn: document.getElementById('tab-login-btn'), form: document.getElementById('login-form') },
    register: { btn: document.getElementById('tab-reg-btn'), form: document.getElementById('register-form') }
};

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is in localStorage
    const savedUser = localStorage.getItem('leafsense_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        showApp();
    }
});

// --- Auth Logic ---
function switchAuthTab(tab) {
    Object.keys(authTabs).forEach(k => {
        authTabs[k].btn.classList.toggle('active', k === tab);
        authTabs[k].form.classList.toggle('active', k === tab);
    });
}

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    errorEl.textContent = "";

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (res.ok) {
            currentUser = data.user;
            localStorage.setItem('leafsense_user', JSON.stringify(currentUser));
            showApp();
        } else {
            errorEl.textContent = data.detail || "Login failed";
        }
    } catch (err) {
        errorEl.textContent = "Server connection failed";
    }
}

async function handleRegister(e) {
    e.preventDefault();
    const data = {
        full_name: document.getElementById('reg-fullname').value,
        email: document.getElementById('reg-email').value,
        username: document.getElementById('reg-username').value,
        password: document.getElementById('reg-password').value
    };
    const errorEl = document.getElementById('reg-error');
    errorEl.textContent = "";

    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const respData = await res.json();

        if (res.ok) {
            alert("Registration successful! Please login.");
            switchAuthTab('login');
        } else {
            errorEl.textContent = respData.detail || "Registration failed";
        }
    } catch (err) {
        errorEl.textContent = "Server connection failed";
    }
}

function showApp() {
    screens.auth.classList.remove('active');
    screens.app.classList.add('active');
    document.getElementById('sidebar-username').textContent = currentUser.full_name || currentUser.username;
    document.getElementById('sidebar-role').textContent = currentUser.role || 'Member';
    document.getElementById('topbar-name').textContent = currentUser.username;
    navigate('detect');
}

function logout() {
    currentUser = null;
    localStorage.removeItem('leafsense_user');
    screens.app.classList.remove('active');
    screens.auth.classList.add('active');
}

// --- Navigation ---
function navigate(pageId) {
    // Update Nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === pageId);
    });

    // Show Page
    document.querySelectorAll('.page').forEach(page => {
        page.classList.toggle('active', page.id === `page-${pageId}`);
    });

    // Set Title
    const titles = {
        detect: "Disease Detection",
        weather: "Weather Guide",
        season: "Seasonal Guide",
        tips: "Farming Tips",
        crop: "Crop Library",
        chat: "AI Assistant",
        history: "Detection History"
    };
    document.getElementById('page-title').textContent = titles[pageId] || "LeafSense-AI";

    // Special logic for history
    if (pageId === 'history') loadHistory();

    // Close sidebar on mobile
    if (window.innerWidth <= 900) {
        document.getElementById('sidebar').classList.add('collapsed');
        document.querySelector('.main-content').classList.add('full');
    }
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const main = document.querySelector('.main-content');
    sidebar.classList.toggle('collapsed');
    main.classList.toggle('full');
}

// --- Disease Detection Logic ---
function handleFileSelect(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('img-preview').src = e.target.result;
            document.getElementById('drop-zone').classList.add('hidden');
            document.getElementById('preview-wrap').classList.remove('hidden');
            document.getElementById('result-placeholder').classList.add('hidden');
            document.getElementById('result-content').classList.add('hidden');
            document.getElementById('chat-inline').style.display = 'none';
        };
        reader.readAsDataURL(file);
    }
}

function resetUpload() {
    document.getElementById('file-input').value = "";
    document.getElementById('drop-zone').classList.remove('hidden');
    document.getElementById('preview-wrap').classList.add('hidden');
    document.getElementById('result-placeholder').classList.remove('hidden');
    document.getElementById('result-content').classList.add('hidden');
    document.getElementById('chat-inline').style.display = 'none';
    document.getElementById('disease-info-box').classList.add('hidden');
    currentPrediction = null;
}

async function analyzeImage() {
    const fileInput = document.getElementById('file-input');
    if (!fileInput.files || !fileInput.files[0]) return;

    showLoading("Analyzing image...");
    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    try {
        const res = await fetch(`${API_BASE}/predict?user_id=${currentUser.id}`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (res.ok) {
            currentPrediction = data.prediction;
            showResult(data.prediction, data.confidence);
        } else {
            alert("Analysis failed: " + data.detail);
        }
    } catch (err) {
        alert("Server error during analysis");
    } finally {
        hideLoading();
    }
}

function showResult(disease, confidence) {
    const content = document.getElementById('result-content');
    const badge = document.getElementById('disease-badge');
    const pct = document.getElementById('conf-pct');
    const bar = document.getElementById('conf-fill');

    content.classList.remove('hidden');
    badge.textContent = disease.replace(/___/g, " - ").replace(/_/g, " ");
    pct.textContent = `${confidence}%`;
    
    // Trigger animation
    setTimeout(() => {
        bar.style.width = `${confidence}%`;
    }, 50);

    // Show inline chat
    document.getElementById('chat-inline').style.display = 'block';
    document.getElementById('inline-chat-messages').innerHTML = "";
    addChatMessage('bot', `I've detected **${disease.replace(/_/g, ' ')}** with **${confidence}%** confidence. Click "Get Disease Info" for detail or ask me anything!`, 'inline-chat-messages');

    // Reset info box
    document.getElementById('disease-info-box').classList.add('hidden');
}

async function loadDiseaseInfo() {
    if (!currentPrediction) return;
    const lang = document.getElementById('detect-lang').value;
    const infoBox = document.getElementById('disease-info-box');
    const btn = document.getElementById('info-btn');

    showLoading("Fetching detailed information...");
    try {
        const res = await fetch(`${API_BASE}/disease-info?disease=${encodeURIComponent(currentPrediction)}&language=${lang}`);
        const data = await res.json();

        if (res.ok) {
            infoBox.innerHTML = formatAIResponse(data.info);
            infoBox.classList.remove('hidden');
            btn.classList.add('hidden');
            // Scroll to info
            infoBox.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
    } catch (err) {
        alert("Failed to fetch disease info");
    } finally {
        hideLoading();
    }
}

// --- Guidance Logic (Weather/Season/Tips/Crop) ---
function selectOption(btn, gridId) {
    document.querySelectorAll(`#${gridId} .option-btn`).forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function selectCrop(chip) {
    document.querySelectorAll(`.crop-chip`).forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
}

async function fetchGuidance(category, optionsId, langId, resultId) {
    const selection = document.querySelector(`#${optionsId} .active`).dataset.val;
    const language = document.getElementById(langId).value;
    const resultBox = document.getElementById(resultId);
    const emptyBox = document.getElementById(`${resultId}-empty`);

    showLoading("Consulting AI expert...");
    try {
        const res = await fetch(`${API_BASE}/guidance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category, selection, language })
        });
        const data = await res.json();

        if (res.ok) {
            emptyBox.classList.add('hidden');
            resultBox.classList.remove('hidden');
            resultBox.innerHTML = `<div class="ai-box-header">Guidance for <strong>${selection}</strong></div>` + formatAIResponse(data.content);
        }
    } catch (err) {
        alert("Failed to get guidance");
    } finally {
        hideLoading();
    }
}

async function fetchCropInfo() {
    const selection = document.querySelector(`.crop-chip.active`).dataset.val;
    const language = document.getElementById('crop-lang').value;
    const resultBox = document.getElementById('crop-result');
    const emptyBox = document.getElementById('crop-result-empty');

    showLoading(`Loading ${selection} guide...`);
    try {
        const res = await fetch(`${API_BASE}/guidance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ category: 'crop', selection, language })
        });
        const data = await res.json();

        if (res.ok) {
            emptyBox.classList.add('hidden');
            resultBox.classList.remove('hidden');
            resultBox.innerHTML = `<div class="ai-box-header">Cultivation Guide: <strong>${selection}</strong></div>` + formatAIResponse(data.content);
        }
    } catch (err) {
        alert("Failed to get crop info");
    } finally {
        hideLoading();
    }
}

// --- Chat Logic ---
async function sendChat() {
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    const lang = document.getElementById('chat-lang').value;
    input.value = "";
    addChatMessage('user', text, 'chat-messages');

    // Show typing
    const typingId = addTypingIndicator('chat-messages');

    try {
        const res = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: text, language: lang })
        });
        const data = await res.json();
        removeTypingIndicator(typingId);

        if (res.ok) {
            addChatMessage('bot', data.response, 'chat-messages');
        } else {
            addChatMessage('bot', "Sorry, I encountered an error.", 'chat-messages');
        }
    } catch (err) {
        removeTypingIndicator(typingId);
        addChatMessage('bot', "Connection lost.", 'chat-messages');
    }
}

async function sendInlineChat() {
    const input = document.getElementById('inline-chat-input');
    const text = input.value.trim();
    if (!text || !currentPrediction) return;

    const lang = document.getElementById('detect-lang').value;
    input.value = "";
    addChatMessage('user', text, 'inline-chat-messages');

    const typingId = addTypingIndicator('inline-chat-messages');

    try {
        const res = await fetch(`${API_BASE}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ question: text, disease: currentPrediction, language: lang })
        });
        const data = await res.json();
        removeTypingIndicator(typingId);

        if (res.ok) {
            addChatMessage('bot', data.response, 'inline-chat-messages');
        }
    } catch (err) {
        removeTypingIndicator(typingId);
    }
}

function addChatMessage(role, content, containerId) {
    const container = document.getElementById(containerId);
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${role}`;
    
    bubble.innerHTML = `
        <div class="bubble-avatar"><i class="fa-solid fa-${role==='bot'?'robot':'user'}"></i></div>
        <div class="bubble-content">${formatAIResponse(content)}</div>
    `;
    
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
}

function sendSuggestion(btn) {
    document.getElementById('chat-input').value = btn.textContent;
    sendChat();
}

function clearChat() {
    document.getElementById('chat-messages').innerHTML = `
        <div class="chat-bubble bot">
            <div class="bubble-avatar"><i class="fa-solid fa-robot"></i></div>
            <div class="bubble-content">Chat cleared. How can I help you today?</div>
        </div>
    `;
}

function addTypingIndicator(containerId) {
    const container = document.getElementById(containerId);
    const id = "typing-" + Date.now();
    const bubble = document.createElement('div');
    bubble.id = id;
    bubble.className = "chat-bubble bot typing-bubble";
    bubble.innerHTML = `
        <div class="bubble-avatar"><i class="fa-solid fa-robot"></i></div>
        <div class="bubble-content"><span></span><span></span><span></span></div>
    `;
    container.appendChild(bubble);
    container.scrollTop = container.scrollHeight;
    return id;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// --- History Logic ---
async function loadHistory() {
    const list = document.getElementById('history-list');
    const empty = document.getElementById('history-empty');

    try {
        const res = await fetch(`${API_BASE}/detections/${currentUser.id}`);
        const data = await res.json();

        if (res.ok && data.data.length > 0) {
            empty.classList.add('hidden');
            list.classList.remove('hidden');
            list.innerHTML = data.data.map(item => `
                <div class="hist-item">
                    <div class="hist-icon"><i class="fa-solid fa-leaf"></i></div>
                    <div class="hist-meta">
                        <div class="hist-disease">${item.predicted_disease.replace(/_/g, " ")}</div>
                        <div class="hist-date">${new Date(item.detection_time).toLocaleString()}</div>
                    </div>
                    <div class="hist-conf">${item.confidence.toFixed(1)}%</div>
                </div>
            `).join('');
        } else {
            empty.classList.remove('hidden');
            list.classList.add('hidden');
        }
    } catch (err) {
        console.error("History fail", err);
    }
}

// --- Utilities ---
function showLoading(text) {
    document.getElementById('loading-text').textContent = text || "Working...";
    document.getElementById('loading-overlay').classList.remove('hidden');
}

function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

function formatAIResponse(text) {
    // Basic Markdown converter
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
        .replace(/^# (.*$)/gim, '<h1>$1</h1>')
        .replace(/^\- (.*$)/gim, '<li>$1</li>')
        .replace(/\n/g, '<br>');
}
