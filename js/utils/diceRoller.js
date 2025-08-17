// --- СТАН ДАЙС-РОЛЛЕРА ---
let currentDiceFormula = "";

/**
 * Додає дайс до поточної формули.
 * @param {string} dice - Рядок, що представляє дайс (напр., 'd100', 'd6').
 */
function addToDiceFormula(dice) {
    if (currentDiceFormula === "") {
        currentDiceFormula = `1${dice}`;
    } else {
        // Перевіряємо, чи останній елемент у формулі - такий самий дайс
        const match = currentDiceFormula.match(new RegExp(`(\\d+)${dice}$`));
        if (match) {
            // Якщо так, збільшуємо лічильник
            const count = parseInt(match[1]) + 1;
            currentDiceFormula = currentDiceFormula.replace(new RegExp(`\\d+${dice}$`), `${count}${dice}`);
        } else {
            // Інакше, додаємо новий дайс
            currentDiceFormula += `+1${dice}`;
        }
    }
    document.getElementById('dice-formula').textContent = currentDiceFormula;
}

/**
 * Виконує кидок за поточною формулою.
 */
function rollDice() {
    if (!currentDiceFormula) return;
    
    // Розбиваємо формулу на частини
    const parts = currentDiceFormula.replace(/-/g, '+-').split('+');
    let total = 0;
    
    parts.forEach(part => {
        if (part.includes('d')) {
            const [count, type] = part.split('d');
            const numCount = parseInt(count) || 1;
            const numType = parseInt(type);
            for (let i = 0; i < Math.abs(numCount); i++) {
                let roll = 0;
                // Обробка спеціальних дайсів
                if (numType === 3) {
                    roll = Math.floor(Math.random() * 3) + 1;
                } else if (numType === 100) {
                    roll = Math.floor(Math.random() * 100) + 1;
                } else {
                    roll = Math.floor(Math.random() * numType) + 1;
                }
                total += roll * Math.sign(numCount);
            }
        } else {
            total += parseInt(part) || 0;
        }
    });

    // Відображення результату з анімацією
    const resultEl = document.getElementById('dice-result');
    const animationEl = document.getElementById('dice-animation');
    
    // Очищення попереднього результату та класів анімації
    resultEl.innerHTML = '';
    resultEl.classList.remove('revealing');
    animationEl.classList.add('rolling');
    
    setTimeout(() => {
        animationEl.classList.remove('rolling');

        // Підготовка результату для анімації "чорнил"
        const totalStr = total.toString();
        const digitsHTML = totalStr.split('').map((digit, index) => {
            // Додавання трохи різної затримки для більш природного вигляду
            const delay = index * 0.1 + Math.random() * 0.1;
            return `<span style="animation-delay: ${delay}s;">${digit}</span>`;
        }).join('');
        
        resultEl.innerHTML = digitsHTML;
        // Використання requestAnimationFrame для гарантії, що клас буде додано після оновлення DOM
        requestAnimationFrame(() => {
            resultEl.classList.add('revealing');
        });

    }, 500);
}

/**
 * Очищує поточну формулу та результат.
 */
function clearDiceFormula() {
    currentDiceFormula = "";
    document.getElementById('dice-formula').textContent = '';
    document.getElementById('dice-result').textContent = '';
}

/**
 * Ініціалізує дайс-роллер, додаючи всі необхідні слухачі подій.
 */
export function initDiceRoller() {
    const diceModal = document.getElementById('dice-roller-modal');
    document.getElementById('open-dice-roller-btn').addEventListener('click', () => { diceModal.classList.remove('hidden'); });
    document.getElementById('close-dice-modal-btn').addEventListener('click', () => { diceModal.classList.add('hidden'); });

    document.querySelector('.dice-buttons').addEventListener('click', e => {
        if (e.target.tagName === 'BUTTON') {
            addToDiceFormula(e.target.dataset.dice);
        }
    });
    document.getElementById('roll-dice-btn').addEventListener('click', rollDice);
    document.getElementById('clear-dice-btn').addEventListener('click', clearDiceFormula);
}
