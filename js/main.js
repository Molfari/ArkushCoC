import { skillsData } from './data/skillsData.js';
import { calculateDBAndBuild, calculateMoveRate } from './utils/calculations.js';
import { initDiceRoller } from './utils/diceRoller.js';

// --- ГЛОБАЛЬНІ ЗМІННІ ТА СТАН ---
const MAX_CHARACTERS = 4;
let characters = [];
let activeCharacterId = null;
let cropper = null;

const defaultCharacter = {
    info: { 
        name: 'Новий Дослідник', 
        occupation: '', 
        age: 30, 
        gender: '', 
        birthplace: '', 
        residence: '',
        portrait: ''
    },
    stats: { str: 50, con: 50, siz: 50, dex: 50, app: 50, int: 50, pow: 50, edu: 50, luck: 50 },
    currentStats: { hp_current: 10, mp_current: 10, san_current: 50, san_max: 99, luck_current: 50 },
    skills: {},
    checkedSkills: {},
    weapons: [
        { name: 'Рукопашний бій', skill: 25, damage: '1D3+БП', range: 'Дотик', attacks: 1, ammo: '-', malfunction: '-' },
        { name: '', skill: '', damage: '', range: '', attacks: '', ammo: '', malfunction: '' },
        { name: '', skill: '', damage: '', range: '', attacks: '', ammo: '', malfunction: '' },
        { name: '', skill: '', damage: '', range: '', attacks: '', ammo: '', malfunction: '' }
    ],
    backstory: { description: '', traits: '', beliefs: '', people: '' },
    notes: [],
    inventory: []
};

const statTranslations = {
    str: 'Сила', con: 'Статура', siz: 'Розмір', dex: 'Спритність', 
    app: 'Зовнішність', int: 'Інтелект', pow: 'Сила Волі', edu: 'Освіта'
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
    // Set initial current luck and sanity based on stats
    newCharacter.currentStats.luck_current = newCharacter.stats.luck;
    newCharacter.currentStats.san_current = newCharacter.stats.pow;
    characters.push(newCharacter);
    saveCharactersToStorage();
    showCharacterSheet(newCharacter.id);
}

function deleteCharacter(id) {
    showConfirmationModal('Ви впевнені, що хочете видалити цього дослідника?', () => {
        characters = characters.filter(char => char.id !== id);
        saveCharactersToStorage();
        showCharacterSelection();
    });
}

// --- УПРАВЛІННЯ ВИДОМ (ЕКРАНАМИ) ---
const selectionScreen = document.getElementById('character-selection-screen');
const sheetScreen = document.getElementById('character-sheet-screen');

function showCharacterSelection() {
    activeCharacterId = null;
    selectionScreen.classList.remove('hidden');
    sheetScreen.classList.add('hidden');
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

        const photoDiv = document.createElement('div');
        photoDiv.className = 'character-card-photo';
        if (char.info.portrait) {
            photoDiv.style.backgroundImage = `url(${char.info.portrait})`;
        } else {
            photoDiv.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
        }

        const infoDiv = document.createElement('div');
        infoDiv.className = 'character-card-info';
        infoDiv.innerHTML = `<h3>${char.info.name || 'Без імені'}</h3><p>${char.info.occupation || 'Рід занять'}</p>`;
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-character-btn';
        deleteBtn.dataset.id = char.id;
        deleteBtn.innerHTML = '&times;';
        
        card.appendChild(photoDiv);
        card.appendChild(infoDiv);
        card.appendChild(deleteBtn);
        
        list.appendChild(card);
    });
    document.getElementById('add-character-btn').disabled = characters.length >= MAX_CHARACTERS;
}

function renderCharacterSheet() {
    const char = characters.find(c => c.id === activeCharacterId);
    if (!char) { showCharacterSelection(); return; }
    
    // Render info fields and portrait
    for (const key in char.info) {
        if (key !== 'portrait') {
            const el = document.getElementById(key);
            if (el) el.value = char.info[key];
        }
    }
    const portraitContainer = document.getElementById('portrait-container');
    if (char.info.portrait) {
        portraitContainer.style.backgroundImage = `url(${char.info.portrait})`;
        portraitContainer.textContent = '';
    } else {
        portraitContainer.style.backgroundImage = 'none';
        portraitContainer.textContent = 'Натисніть, щоб завантажити фото';
    }

    for (const key in char.stats) {
        const el = document.getElementById(key);
        if (el) el.value = char.stats[key];
    }
    for (const key in char.currentStats) {
        const el = document.getElementById(key);
        if (el) el.value = char.currentStats[key];
    }

    // Manually set initial luck value as it's not in currentStats
    document.getElementById('luck_start').value = char.stats.luck;

    for (const key in char.backstory) {
        const el = document.querySelector(`#backstory-sheet textarea[data-field="${key}"]`);
        if(el) el.value = char.backstory[key];
    }
    
    skillsData.forEach(skill => {
        const skillId = skill.name.toLowerCase().replace(/[\s()/]/g, '_');
        const checkbox = document.getElementById(`${skillId}_check`);
        if(checkbox) {
            checkbox.checked = char.checkedSkills ? (char.checkedSkills[skillId] || false) : false;
        }
    });

    renderWeapons();
    renderNotes();
    renderInventory();
    updateUI();
}

function updateUI() {
    const char = characters.find(c => c.id === activeCharacterId);
    if (!char) return;

    const { str, con, siz, dex, pow, edu, luck } = char.stats;
    const { san_current } = char.currentStats;
    const { age } = char.info;

    for (const key in char.stats) {
        const elHalf = document.getElementById(`${key}_half`);
        const elFifth = document.getElementById(`${key}_fifth`);
        if(elHalf) elHalf.textContent = Math.floor(char.stats[key] / 2);
        if(elFifth) elFifth.textContent = Math.floor(char.stats[key] / 5);
    }
    
    document.getElementById('hp_max').value = Math.floor((con + siz) / 10);
    document.getElementById('mp_max').value = Math.floor(pow / 5);
    document.getElementById('san_start').value = pow;
    document.getElementById('san_insane').value = Math.floor(san_current / 5);
    
    const { db, build } = calculateDBAndBuild(str, siz);
    document.getElementById('db').value = db;
    document.getElementById('build').value = build;

    document.getElementById('move_rate').value = calculateMoveRate(str, dex, siz, age);
    
    skillsData.forEach(skill => {
        const skillId = skill.name.toLowerCase().replace(/[\s()/]/g, '_');
        const el = document.getElementById(skillId);
        const elHalf = document.getElementById(`${skillId}_half`);
        const elFifth = document.getElementById(`${skillId}_fifth`);
        
        let value;
        if (char.skills[skillId] !== undefined) {
            value = char.skills[skillId];
        } else {
            const skillInfo = skillsData.find(s => s.name.toLowerCase().replace(/[\s()/]/g, '_') === skillId);
            if (skillInfo.base === 'edu') {
                value = edu;
            } else if (skillInfo.base === 'dex') {
                value = Math.floor(dex / 2);
            } else {
                value = skillInfo.base;
            }
        }
        
        if (el) el.value = value;
        if (elHalf) elHalf.textContent = Math.floor(value / 2);
        if (elFifth) elFifth.textContent = Math.floor(value / 5);

        const valueBox = el.closest('.skill-value-box');
        if (valueBox) {
            valueBox.classList.remove('skill-active');
        }
    });

    // Update weapon skills
    if (char.weapons) {
        char.weapons.forEach((weapon, index) => {
            const skillValue = weapon.skill || 0;
            const halfEl = document.getElementById(`weapon_${index}_half`);
            const fifthEl = document.getElementById(`weapon_${index}_fifth`);
            
            if (halfEl) halfEl.textContent = Math.floor(skillValue / 2);
            if (fifthEl) fifthEl.textContent = Math.floor(skillValue / 5);

            if (halfEl) {
                const valueBox = halfEl.closest('.skill-value-box');
                if (valueBox) {
                    valueBox.classList.remove('skill-active');
                }
            }
        });
    }
}

// --- ЛОГІКА ЗБРОЇ ---
function renderWeapons() {
    const char = characters.find(c => c.id === activeCharacterId);
    if (!char) return;
    const container = document.getElementById('weapons-container');
    container.innerHTML = ''; 

    if (!char.weapons) {
        char.weapons = JSON.parse(JSON.stringify(defaultCharacter.weapons));
    }

    char.weapons.forEach((weapon, index) => {
        const card = document.createElement('div');
        card.className = 'weapon-card';
        card.innerHTML = `
            <div class="weapon-card-header">
                <input type="text" value="${weapon.name}" data-weapon-index="${index}" data-field="name" placeholder="Назва зброї">
            </div>
            <div class="weapon-card-body">
                <div class="weapon-stat skill">
                    <label>Вміння %</label>
                    <div class="skill-value-box">
                        <input type="number" value="${weapon.skill || ''}" data-weapon-index="${index}" data-field="skill">
                        <span id="weapon_${index}_half"></span>
                        <span id="weapon_${index}_fifth"></span>
                    </div>
                </div>
                <div class="weapon-stat"><label>Пошкодж.</label><input type="text" value="${weapon.damage}" data-weapon-index="${index}" data-field="damage"></div>
                <div class="weapon-stat"><label>Дальність</label><input type="text" value="${weapon.range}" data-weapon-index="${index}" data-field="range"></div>
                <div class="weapon-stat"><label>Атак</label><input type="number" value="${weapon.attacks || ''}" data-weapon-index="${index}" data-field="attacks"></div>
                <div class="weapon-stat"><label>Набоїв</label><input type="text" value="${weapon.ammo}" data-weapon-index="${index}" data-field="ammo"></div>
                <div class="weapon-stat"><label>Несправн.</label><input type="text" value="${weapon.malfunction}" data-weapon-index="${index}" data-field="malfunction"></div>
            </div>
        `;
        container.appendChild(card);
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
    showConfirmationModal('Ви впевнені, що хочете видалити цю нотатку?', () => {
        const char = characters.find(c => c.id === activeCharacterId);
        if (!char || !char.notes || !char.notes[index]) return;
        char.notes.splice(index, 1);
        saveCharactersToStorage();
        renderNotes();
    });
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
    showConfirmationModal('Ви впевнені, що хочете видалити цей предмет?', () => {
        const char = characters.find(c => c.id === activeCharacterId);
        if (!char || !char.inventory || !char.inventory[index]) return;
        char.inventory.splice(index, 1);
        saveCharactersToStorage();
        renderInventory();
    });
}

// --- Confirmation Modal Logic ---
const confirmationModal = document.getElementById('confirmation-modal');
const confirmationMessage = document.getElementById('confirmation-message');
const confirmYesBtn = document.getElementById('confirm-yes-btn');
const confirmNoBtn = document.getElementById('confirm-no-btn');
let onConfirmCallback = null;

function showConfirmationModal(message, callback) {
    confirmationMessage.textContent = message;
    onConfirmCallback = callback;
    confirmationModal.classList.remove('hidden');
}

function hideConfirmationModal() {
    confirmationModal.classList.add('hidden');
    onConfirmCallback = null;
}

// --- ІНІЦІАЛІЗАЦІЯ ТА СЛУХАЧІ ПОДІЙ ---
function init() {
    // Генерація HTML
    const headerContainer = document.getElementById('character-header-container');
    headerContainer.innerHTML = `
        <div class="info-fields">
            <div><label>Ім’я</label><input type="text" id="name"></div>
            <div><label>Рід занять</label><input type="text" id="occupation"></div>
            <div><label>Місце народження</label><input type="text" id="birthplace"></div>
            <div><label>Місце проживання</label><input type="text" id="residence"></div>
            <div><label>Стать</label><input type="text" id="gender"></div>
            <div><label>Вік</label><input type="number" id="age"></div>
        </div>
        <div id="portrait-container" class="portrait-container">
            Натисніть, щоб завантажити фото
        </div>
    `;

    const statsContainer = document.getElementById('stats-container');
    statsContainer.innerHTML = Object.keys(statTranslations).map(key => 
        `<div class="char-box">
            <label>${statTranslations[key]}</label>
            <div class="value-split">
                <div class="main-value"><input type="number" id="${key}"></div>
                <div class="half-value" id="${key}_half"></div>
                <div class="fifth-value" id="${key}_fifth"></div>
            </div>
        </div>`
    ).join('');
    
    const currentStatsContainer = document.getElementById('current-stats-container');
    currentStatsContainer.innerHTML = `<div class="stat-box"><label>Очки здоров'я</label><div class="stat-values"><div><input type="number" id="hp_current"><label>Поточне</label></div><div><input type="number" id="hp_max" readonly><label>Макс.</label></div></div></div> <div class="stat-box"><label>Очки магії</label><div class="stat-values"><div><input type="number" id="mp_current"><label>Поточне</label></div><div><input type="number" id="mp_max" readonly><label>Макс.</label></div></div></div> <div class="stat-box"><label>Талан</label><div class="stat-values"><div><input type="number" id="luck_start"><label>Початк.</label></div><div><input type="number" id="luck_current"><label>Поточний</label></div></div></div> <div class="stat-box"><label>Глузд</label><div class="stat-values three-parts"><div><input type="number" id="san_start" readonly><label>Початк.</label></div><div><input type="number" id="san_current"><label>Поточний</label></div><div><input type="number" id="san_insane" readonly><label>Божевілля</label></div></div></div>`;
    
    const derivedStatsContainer = document.getElementById('derived-stats-container');
    derivedStatsContainer.innerHTML = `<div class="char-box"><label>Бонусні пошкодження</label><div class="value-split"><div class="main-value"><input type="text" id="db" readonly></div><div class="half-value">-</div><div class="fifth-value">-</div></div></div> <div class="char-box"><label>Будова</label><div class="value-split"><div class="main-value"><input type="text" id="build" readonly></div><div class="half-value">-</div><div class="fifth-value">-</div></div></div> <div class="char-box"><label>Переміщення</label><div class="value-split"><div class="main-value"><input type="text" id="move_rate" readonly></div><div class="half-value">-</div><div class="fifth-value">-</div></div></div>`;

    const skillsContainer = document.getElementById('skills-container');
    skillsContainer.innerHTML = skillsData.map(skill => {
        const skillId = skill.name.toLowerCase().replace(/[\s()/]/g, '_');
        return `<div class="skill-item">
                    <input type="checkbox" class="skill-checkbox" id="${skillId}_check" data-skill-id="${skillId}">
                    <label for="${skillId}_check">${skill.name} (${skill.base}%):</label>
                    <div class="skill-value-box">
                        <input type="number" id="${skillId}" ${skill.readonly ? 'readonly' : ''}>
                        <span id="${skillId}_half"></span>
                        <span id="${skillId}_fifth"></span>
                    </div>
                </div>`;
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

    sheetScreen.addEventListener('input', e => {
        const char = characters.find(c => c.id === activeCharacterId);
        if (!char) return;

        if (e.target.classList.contains('skill-checkbox')) {
            const skillId = e.target.dataset.skillId;
            if (!char.checkedSkills) char.checkedSkills = {};
            char.checkedSkills[skillId] = e.target.checked;
            saveCharactersToStorage();
            return;
        }

        const weaponIndex = e.target.dataset.weaponIndex;
        if (weaponIndex !== undefined) {
            const field = e.target.dataset.field;
            const value = e.target.type === 'number' ? parseInt(e.target.value, 10) || 0 : e.target.value;
            char.weapons[weaponIndex][field] = value;
            saveCharactersToStorage();
            if(field === 'skill') updateUI();
            return;
        }

        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.contentEditable !== 'true') return;
        
        const id = e.target.id;
        const value = e.target.type === 'number' ? (parseInt(e.target.value, 10) || 0) : e.target.value;

        if (id === 'luck_start') {
            char.stats.luck = value;
        } else if (char.info.hasOwnProperty(id)) {
            char.info[id] = value;
        } else if (char.stats.hasOwnProperty(id)) {
            char.stats[id] = value;
        } else if (char.currentStats.hasOwnProperty(id)) {
            char.currentStats[id] = value;
        } else if (e.target.dataset.field && char.backstory.hasOwnProperty(e.target.dataset.field)) {
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

    sheetScreen.querySelector('.tabs').addEventListener('click', e => {
        const tabButton = e.target.closest('.tab-button');
        if (tabButton) {
            sheetScreen.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
            sheetScreen.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
            
            tabButton.classList.add('active');
            document.getElementById(tabButton.dataset.tab).classList.add('active');
        }
    });

    // Модальні вікна
    const aboutModal = document.getElementById('about-modal');
    document.getElementById('about-link').addEventListener('click', (e) => { e.preventDefault(); aboutModal.classList.remove('hidden'); });
    document.getElementById('close-about-modal-btn').addEventListener('click', () => { aboutModal.classList.add('hidden'); });
    
    // Ініціалізація дайс-роллера
    initDiceRoller();

    // Cropper.js Logic
    const cropperModal = document.getElementById('cropper-modal');
    const imageInput = document.getElementById('image-input');
    const cropperImage = document.getElementById('cropper-image');

    document.getElementById('character-header-container').addEventListener('click', (e) => {
        if (e.target.id === 'portrait-container') {
            imageInput.click();
        }
    });

    imageInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files && files.length > 0) {
            const reader = new FileReader();
            reader.onload = () => {
                cropperModal.classList.remove('hidden');
                cropperImage.src = reader.result;
                cropper = new Cropper(cropperImage, {
                    aspectRatio: 3 / 4,
                    viewMode: 1,
                });
            };
            reader.readAsDataURL(files[0]);
        }
        e.target.value = '';
    });
    
    document.getElementById('crop-save-btn').addEventListener('click', () => {
        if (cropper) {
            const canvas = cropper.getCroppedCanvas({
                width: 300,
                height: 400,
            });
            const char = characters.find(c => c.id === activeCharacterId);
            if (char) {
                char.info.portrait = canvas.toDataURL('image/jpeg');
                saveCharactersToStorage();
                renderCharacterSheet();
            }
            cropper.destroy();
            cropper = null;
            cropperModal.classList.add('hidden');
        }
    });

    document.getElementById('crop-cancel-btn').addEventListener('click', () => {
        if (cropper) {
            cropper.destroy();
            cropper = null;
        }
        cropperModal.classList.add('hidden');
    });

    // Confirmation Modal Listeners
    confirmYesBtn.addEventListener('click', () => {
        if (onConfirmCallback) {
            onConfirmCallback();
        }
        hideConfirmationModal();
    });

    confirmNoBtn.addEventListener('click', () => {
        hideConfirmationModal();
    });

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
