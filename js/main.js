import { skillsData } from './data/skillsData.js';
import { calculateDBAndBuild, calculateMoveRate } from './utils/calculations.js';
import { initDiceRoller } from './utils/diceRoller.js';

// --- ГЛОБАЛЬНІ ЗМІННІ ТА СТАН ---
const MAX_CHARACTERS = 4;
let characters = [];
let activeCharacterId = null;

const defaultCharacter = {
    info: { name: 'Новий Дослідник', occupation: '', player: '', age: 30, gender: '', birthplace: '', residence: '' },
    stats: { str: 50, con: 50, siz: 50, dex: 50, app: 50, int: 50, pow: 50, edu: 50 },
    currentStats: { hp_current: 10, mp_current: 10, san_current: 50, san_max: 99 },
    skills: {},
    backstory: { description: '', traits: '', beliefs: '', people: '' },
    notes: [],
    inventory: []
};

// --- УПРАВЛІННЯ ДАНИМИ (localStorage) ---
function loadCharactersFromStorage() {
    const data = localStorage.getItem('coc_characters');
    characters = data ? JSON.parse(data) : [];
}

function saveCharactersToStorage() {
    localStorage.setItem('coc_characters', JSON.stringify(characters));
}

function createCharacter() {
    if (characters.length >= MAX_CHARACTERS) {
        alert('Ви можете створити максимум 4 персонажів.');
        return;
    }
    const newCharacter = JSON.parse(JSON.stringify(defaultCharacter));
    newCharacter.id = Date.now().toString();
    characters.push(newCharacter);
    saveCharactersToStorage();
    showCharacterSheet(newCharacter.id);
}

function deleteCharacter(id) {
    if (confirm('Ви впевнені, що хочете видалити цього дослідника?')) {
        characters = characters.filter(char => char.id !== id);
        saveCharactersToStorage();
        renderCharacterSelection();
    }
}

// --- УПРАВЛІННЯ ВИДОМ (ЕКРАНАМИ) ---
const selectionScreen = document.getElementById('character-selection-screen');
const sheetScreen = document.getElementById('character-sheet-screen');

function showCharacterSelection() {
    selectionScreen.classList.remove('hidden');
    sheetScreen.classList.add('hidden');
    activeCharacterId = null;
    renderCharacterSelection();
}

function showCharacterSheet(id) {
    activeCharacterId = id;
    selectionScreen.classList.add('hidden');
    sheetScreen.classList.remove('hidden');
    renderCharacterSheet();
}

// --- РЕНДЕРИНГ (ВІДОБРАЖЕННЯ ДАНИХ) ---
function renderCharacterSelection() {
    const list = document.getElementById('characters-list');
    list.innerHTML = '';
    characters.forEach(char => {
        const card = document.createElement('div');
        card.className = 'character-card';
        card.dataset.id = char.id;
        card.innerHTML = `<h3>${char.info.name || 'Без імені'}</h3><p>${char.info.occupation || 'Рід занять'}</p><button class="delete-character-btn" data-id="${char.id}">&times;</button>`;
        list.appendChild(card);
    });
    document.getElementById('add-character-btn').disabled = characters.length >= MAX_CHARACTERS;
}

function renderCharacterSheet() {
    const char = characters.find(c => c.id === activeCharacterId);
    if (!char) { showCharacterSelection(); return; }
    
    for (const key in char.info) {
        const el = document.getElementById(key);
        if (el) el.value = char.info[key];
    }
    for (const key in char.stats) {
        const el = document.getElementById(key);
        if (el) el.value = char.stats[key];
    }
    for (const key in char.currentStats) {
        const el = document.getElementById(key);
        if (el) el.value = char.currentStats[key];
    }
    for (const key in char.backstory) {
        const el = document.querySelector(`#backstory-sheet textarea[data-field="${key}"]`);
        if(el) el.value = char.backstory[key];
    }
    renderNotes();
    renderInventory();
    updateUI();
}

function updateUI() {
    const char = characters.find(c => c.id === activeCharacterId);
    if (!char) return;

    const { str, con, siz, dex, pow, edu } = char.stats;
    const { age } = char.info;

    for (const key in char.stats) {
        document.getElementById(`${key}_half`).textContent = Math.floor(char.stats[key] / 2);
        document.getElementById(`${key}_fifth`).textContent = Math.floor(char.stats[key] / 5);
    }
    
    document.getElementById('hp_max').value = Math.floor((con + siz) / 10);
    document.getElementById('mp_max').value = Math.floor(pow / 5);
    document.getElementById('san_start').value = pow;

    const { db, build } = calculateDBAndBuild(str, siz);
    document.getElementById('db').value = db;
    document.getElementById('build').value = build;

    document.getElementById('move_rate').value = calculateMoveRate(str, dex, siz, age);
    
    skillsData.forEach(skill => {
        const skillId = skill.name.toLowerCase().replace(/[\s()/]/g, '_');
        let value;
        if (skill.base === 'edu') value = edu;
        else if (skill.base === 'dex') value = Math.floor(dex / 2);
        else value = char.skills[skillId] || skill.base;
        
        const el = document.getElementById(skillId);
        if (el && el.value != value) el.value = value;
        document.getElementById(`${skillId}_half`).textContent = Math.floor(value / 2);
        document.getElementById(`${skillId}_fifth`).textContent = Math.floor(value / 5);
    });
}

// --- ЛОГІКА НОТАТОК ---
function renderNotes() {
    const char = characters.find(c => c.id === activeCharacterId);
    if (!char) return;
    const container = document.getElementById('notes-container');
    container.innerHTML = '';
    (char.notes || []).forEach((note, index) => {
        const noteEl = document.createElement('div');
        noteEl.className = 'note-item';
        noteEl.innerHTML = `
            <input type="text" class="note-title" value="${note.title}" data-index="${index}">
            <div class="note-toolbar">
                <button class="note-format-btn" data-command="bold"><b>B</b></button>
                <button class="note-format-btn" data-command="italic"><i>I</i></button>
            </div>
            <div class="note-content" contenteditable="true" data-index="${index}">${note.content}</div>
            <button class="delete-note-btn" data-index="${index}">&times;</button>
        `;
        container.appendChild(noteEl);
    });
}

function addNote() {
    const char = characters.find(c => c.id === activeCharacterId);
    if (!char) return;
    if (!char.notes) char.notes = [];
    char.notes.push({ title: 'Новий запис', content: '' });
    saveCharactersToStorage();
    renderNotes();
}

function updateNote(index, field, value) {
    const char = characters.find(c => c.id === activeCharacterId);
    if (!char || !char.notes || !char.notes[index]) return;
    char.notes[index][field] = value;
    saveCharactersToStorage();
}

function deleteNote(index) {
    const char = characters.find(c => c.id === activeCharacterId);
    if (!char || !char.notes || !char.notes[index]) return;
    char.notes.splice(index, 1);
    saveCharactersToStorage();
    renderNotes();
}

// --- ЛОГІКА ІНВЕНТАРЯ ---
function renderInventory() {
    const char = characters.find(c => c.id === activeCharacterId);
    if (!char) return;
    const container = document.getElementById('inventory-container');
    container.innerHTML = `
        <table class="inventory-table">
            <thead>
                <tr>
                    <th class="item-name-col">Предмет</th>
                    <th class="quantity-col">Кількість</th>
                    <th class="delete-col"></th>
                </tr>
            </thead>
            <tbody>
                ${(char.inventory || []).map((item, index) => `
                    <tr>
                        <td><input type="text" class="inventory-item-name" data-index="${index}" value="${item.name}"></td>
                        <td class="quantity-col"><input type="number" class="inventory-item-quantity" data-index="${index}" value="${item.quantity}" min="0"></td>
                        <td class="delete-col"><button class="delete-inventory-item-btn" data-index="${index}">&times;</button></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function addInventoryItem() {
    const char = characters.find(c => c.id === activeCharacterId);
    if (!char) return;
    if (!char.inventory) char.inventory = [];
    char.inventory.push({ name: 'Новий предмет', quantity: 1 });
    saveCharactersToStorage();
    renderInventory();
}

function updateInventoryItem(index, field, value) {
    const char = characters.find(c => c.id === activeCharacterId);
    if (!char || !char.inventory || !char.inventory[index]) return;
    char.inventory[index][field] = value;
    saveCharactersToStorage();
}

function deleteInventoryItem(index) {
    const char = characters.find(c => c.id === activeCharacterId);
    if (!char || !char.inventory || !char.inventory[index]) return;
    char.inventory.splice(index, 1);
    saveCharactersToStorage();
    renderInventory();
}

// --- ІНІЦІАЛІЗАЦІЯ ТА СЛУХАЧІ ПОДІЙ ---
function init() {
    // Генерація HTML
    const infoContainer = document.getElementById('info-container');
    infoContainer.innerHTML = `<div><label>Ім'я</label><input type="text" id="name"></div> <div><label>Рід занять</label><input type="text" id="occupation"></div> <div><label>Гравець</label><input type="text" id="player"></div> <div><label>Вік</label><input type="number" id="age"></div> <div><label>Стать</label><input type="text" id="gender"></div> <div><label>Місце народження</label><input type="text" id="birthplace"></div> <div><label>Місце проживання</label><input type="text" id="residence"></div>`;

    const statsContainer = document.getElementById('stats-container');
    statsContainer.innerHTML = ['str', 'con', 'siz', 'dex', 'app', 'int', 'pow', 'edu'].map(s => `<div class="char-box"><label>${s.toUpperCase()}</label><div class="value-split"><div class="main-value"><input type="number" id="${s}"></div><div class="half-value" id="${s}_half"></div><div class="fifth-value" id="${s}_fifth"></div></div></div>`).join('');

    const currentStatsContainer = document.getElementById('current-stats-container');
    currentStatsContainer.innerHTML = `<div class="stat-box"><label>Очки здоров'я</label><div class="stat-values"><div><input type="number" id="hp_current"><label>Поточне</label></div><div><input type="number" id="hp_max" readonly><label>Макс.</label></div></div></div> <div class="stat-box"><label>Очки магії</label><div class="stat-values"><div><input type="number" id="mp_current"><label>Поточне</label></div><div><input type="number" id="mp_max" readonly><label>Макс.</label></div></div></div> <div class="stat-box"><label>Глузд</label><div class="stat-values"><div><input type="number" id="san_current"><label>Поточний</label></div><div><input type="number" id="san_start" readonly><label>Початк.</label></div></div></div> <div class="stat-box"><label>Макс. глузд</label><div class="stat-values san-max-container"><input type="number" id="san_max"></div></div>`;
    
    const derivedStatsContainer = document.getElementById('derived-stats-container');
    derivedStatsContainer.innerHTML = `<div class="char-box"><label>Бонусні пошкодження</label><div class="value-split"><div class="main-value"><input type="text" id="db" readonly></div><div class="half-value">-</div><div class="fifth-value">-</div></div></div> <div class="char-box"><label>Будова</label><div class="value-split"><div class="main-value"><input type="text" id="build" readonly></div><div class="half-value">-</div><div class="fifth-value">-</div></div></div> <div class="char-box"><label>Переміщення</label><div class="value-split"><div class="main-value"><input type="text" id="move_rate" readonly></div><div class="half-value">-</div><div class="fifth-value">-</div></div></div>`;

    const skillsContainer = document.getElementById('skills-container');
    skillsContainer.innerHTML = skillsData.map(skill => {
        const skillId = skill.name.toLowerCase().replace(/[\s()/]/g, '_');
        return `<div class="skill-item"><label>${skill.name} (${skill.base}%):</label><div class="skill-value-box"><input type="number" id="${skillId}" ${skill.readonly ? 'readonly' : ''}><span id="${skillId}_half"></span><span id="${skillId}_fifth"></span></div></div>`;
    }).join('');

    // Слухачі подій
    document.getElementById('add-character-btn').addEventListener('click', createCharacter);
    document.getElementById('back-to-selection-btn').addEventListener('click', showCharacterSelection);
    document.getElementById('add-note-btn').addEventListener('click', addNote);
    document.getElementById('add-inventory-item-btn').addEventListener('click', addInventoryItem);

    document.getElementById('characters-list').addEventListener('click', e => {
        if (e.target.classList.contains('delete-character-btn')) {
            deleteCharacter(e.target.dataset.id);
        } else if (e.target.closest('.character-card')) {
            showCharacterSheet(e.target.closest('.character-card').dataset.id);
        }
    });

    document.getElementById('character-sheet-screen').addEventListener('input', e => {
        const char = characters.find(c => c.id === activeCharacterId);
        if (!char || (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA')) return;
        
        const id = e.target.id;
        const value = e.target.type === 'number' ? (parseInt(e.target.value, 10) || 0) : e.target.value;

        if (char.info.hasOwnProperty(id)) char.info[id] = value;
        else if (char.stats.hasOwnProperty(id)) char.stats[id] = value;
        else if (char.currentStats.hasOwnProperty(id)) char.currentStats[id] = value;
        else if (e.target.dataset.field && char.backstory.hasOwnProperty(e.target.dataset.field)) {
            char.backstory[e.target.dataset.field] = value;
        } else {
            const isSkill = skillsData.some(s => s.name.toLowerCase().replace(/[\s()/]/g, '_') === id);
            if (isSkill) char.skills[id] = value;
        }
        
        saveCharactersToStorage();
        if (id !== 'name') updateUI();
        else renderCharacterSelection();
    });

    const notesContainer = document.getElementById('notes-container');
    notesContainer.addEventListener('input', e => {
        const index = e.target.dataset.index;
        if (index !== undefined && e.target.classList.contains('note-title')) {
            updateNote(index, 'title', e.target.value);
        }
    });
    notesContainer.addEventListener('blur', e => {
        const index = e.target.dataset.index;
        if (index !== undefined && e.target.classList.contains('note-content')) {
            updateNote(index, 'content', e.target.innerHTML);
        }
    }, true);
    notesContainer.addEventListener('click', e => {
        const target = e.target;
        if (target.classList.contains('delete-note-btn')) {
            deleteNote(target.dataset.index);
            return;
        }
        const formatBtn = target.closest('.note-format-btn');
        if (formatBtn) {
            e.preventDefault();
            const command = formatBtn.dataset.command;
            document.execCommand(command, false, null);
        }
    });

    const inventoryContainer = document.getElementById('inventory-container');
    inventoryContainer.addEventListener('input', e => {
        const index = e.target.dataset.index;
        if (index === undefined) return;
        if (e.target.classList.contains('inventory-item-name')) {
            updateInventoryItem(index, 'name', e.target.value);
        } else if (e.target.classList.contains('inventory-item-quantity')) {
            updateInventoryItem(index, 'quantity', parseInt(e.target.value, 10) || 0);
        }
    });
    inventoryContainer.addEventListener('click', e => {
        if (e.target.classList.contains('delete-inventory-item-btn')) {
            deleteInventoryItem(e.target.dataset.index);
        }
    });

    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', e => {
            document.querySelectorAll('.tab-button, .tab-content').forEach(el => el.classList.remove('active'));
            e.target.classList.add('active');
            document.getElementById(e.target.dataset.tab).classList.add('active');
        });
    });

    // Модальні вікна
    const aboutModal = document.getElementById('about-modal');
    document.getElementById('about-link').addEventListener('click', (e) => { e.preventDefault(); aboutModal.classList.remove('hidden'); });
    document.getElementById('close-about-modal-btn').addEventListener('click', () => { aboutModal.classList.add('hidden'); });
    
    // Ініціалізація дайс-роллера
    initDiceRoller();

    // Запуск
    loadCharactersFromStorage();
    showCharacterSelection();
}

// Реєстрація Service Worker для PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => console.log('SW registered!'), err => console.log('SW registration failed: ', err));
    });
}

init();
