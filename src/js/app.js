import '../css/style.css';

class Storage {
  static STORAGE_KEY = 'trello-board-data';

  static saveBoardData(columns) {
    const data = {
      todo: columns.todo,
      inProgress: columns.inProgress,
      done: columns.done,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
  }

  static loadBoardData() {
    const data = localStorage.getItem(this.STORAGE_KEY);
    if (data) {
      try {
        const parsed = JSON.parse(data);
        return {
          todo: parsed.todo || [],
          inProgress: parsed.inProgress || [],
          done: parsed.done || [],
        };
      } catch (e) {
        return {
          todo: [
            'Welcome to Trello!',
            'This is a card.',
            'Click on a card to see what\'s behind it.',
            'You can attach pictures and files...',
          ],
          inProgress: [
            'Drag people onto a card',
            'Use color-coded labels',
            'Make as many lists as you need!',
            'Try dragging cards anywhere.',
          ],
          done: [
            'To learn more tricks, check out the guide.',
            'Use as many boards as you want.',
            'Want to use keyboard shortcuts?',
          ],
        };
      }
    }
    return {
      todo: [
        'Welcome to Trello!',
        'This is a card.',
        'Click on a card to see what\'s behind it.',
        'You can attach pictures and files...',
      ],
      inProgress: [
        'Drag people onto a card',
        'Use color-coded labels',
        'Make as many lists as you need!',
        'Try dragging cards anywhere.',
      ],
      done: [
        'To learn more tricks, check out the guide.',
        'Use as many boards as you want.',
        'Want to use keyboard shortcuts?',
      ],
    };
  }

  static clearAllData() {
    localStorage.removeItem(this.STORAGE_KEY);
    return {
      todo: [],
      inProgress: [],
      done: [],
    };
  }
}

class DragDrop {
  constructor(app) {
    this.app = app;
    this.draggedCard = null;
    this.dragOffset = { x: 0, y: 0 };
    this.placeholder = null;
    this.dragColumn = null;
    this.targetColumn = null;
    this.targetPosition = -1;

    this.init();
  }

  init() {
    this.createPlaceholder();
    document.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    document.addEventListener('mouseup', (e) => this.handleMouseUp(e));
  }

  createPlaceholder() {
    this.placeholder = document.getElementById('dragPlaceholder');
    if (!this.placeholder) {
      this.placeholder = document.createElement('div');
      this.placeholder.id = 'dragPlaceholder';
      this.placeholder.className = 'drag-placeholder';
      document.body.appendChild(this.placeholder);
    }
  }

  handleMouseDown(e) {
    const card = e.target.closest('.card');
    if (!card || e.target.closest('.card-delete')) return;

    e.preventDefault();
    this.startDrag(card, e);
  }

  startDrag(card, e) {
    this.draggedCard = card;
    this.dragColumn = card.closest('.column').dataset.column;

    const cardRect = card.getBoundingClientRect();
    this.dragOffset.x = e.clientX - cardRect.left;
    this.dragOffset.y = e.clientY - cardRect.top;

    card.classList.add('dragging');

    this.placeholder.innerHTML = card.querySelector('.card-content').innerHTML;
    this.placeholder.style.width = `${cardRect.width}px`;
    this.placeholder.style.display = 'block';

    this.updatePlaceholderPosition(e);
  }

  handleMouseMove(e) {
    if (!this.draggedCard) return;

    e.preventDefault();
    this.updatePlaceholderPosition(e);
    this.updateDropTarget(e);
  }

  updatePlaceholderPosition(e) {
    this.placeholder.style.left = `${e.clientX - this.dragOffset.x}px`;
    this.placeholder.style.top = `${e.clientY - this.dragOffset.y}px`;
  }

  updateDropTarget(e) {
    this.placeholder.style.display = 'none';
    const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
    this.placeholder.style.display = 'block';

    const targetContainer = elementUnderCursor.closest('.cards-container');
    if (!targetContainer) return;

    this.targetColumn = targetContainer.dataset.column;

    document.querySelectorAll('.cards-container').forEach((container) => {
      container.classList.remove('drag-over');
    });

    targetContainer.classList.add('drag-over');

    const cards = Array.from(targetContainer.querySelectorAll('.card:not(.dragging)'));
    if (cards.length === 0) {
      this.targetPosition = 0;
    } else {
      const containerRect = targetContainer.getBoundingClientRect();
      const relativeY = e.clientY - containerRect.top;

      for (let i = 0; i < cards.length; i++) {
        const cardRect = cards[i].getBoundingClientRect();
        const cardMiddle = cardRect.top - containerRect.top + cardRect.height / 2;

        if (relativeY < cardMiddle) {
          this.targetPosition = i;
          return;
        }
      }
      this.targetPosition = cards.length;
    }
  }

  handleMouseUp(e) {
    if (!this.draggedCard) return;

    e.preventDefault();
    this.finishDrag();
  }

  finishDrag() {
    if (this.draggedCard && this.targetColumn !== null) {
      const cardContent = this.draggedCard.querySelector('.card-content').textContent;
      this.draggedCard.remove();

      const targetContainer = document.querySelector(`[data-column="${this.targetColumn}"] .cards-container`);
      const cards = Array.from(targetContainer.querySelectorAll('.card'));

      if (cards.length === 0 || this.targetPosition >= cards.length) {
        this.app.addCardToColumn(this.targetColumn, cardContent, false);
      } else {
        const newCard = this.app.createCardElement(cardContent);
        targetContainer.insertBefore(newCard, cards[this.targetPosition]);
        this.app.updateColumnData();
      }
    }

    this.cleanupDrag();
  }

  cleanupDrag() {
    if (this.draggedCard) {
      this.draggedCard.classList.remove('dragging');
    }

    this.placeholder.style.display = 'none';
    this.draggedCard = null;
    this.dragColumn = null;
    this.targetColumn = null;
    this.targetPosition = -1;

    document.querySelectorAll('.cards-container').forEach((container) => {
      container.classList.remove('drag-over');
    });
  }
}

class TrelloApp {
  constructor() {
    this.columns = Storage.loadBoardData();
    this.dragDrop = new DragDrop(this);
    this.renderBoard();
    this.setupEventListeners();
    this.updateCardCounts();
  }

  renderBoard() {
    ['todo', 'inProgress', 'done'].forEach((columnId) => {
      const container = document.querySelector(`[data-column="${columnId}"] .cards-container`);
      container.innerHTML = '';
      this.columns[columnId].forEach((cardText) => {
        container.appendChild(this.createCardElement(cardText));
      });
    });
  }

  createCardElement(text) {
    const card = document.createElement('div');
    card.className = 'card';
    card.draggable = true;

    const content = document.createElement('div');
    content.className = 'card-content';
    content.textContent = text;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'card-delete';
    deleteBtn.innerHTML = '✕';
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      this.deleteCard(card);
    };

    card.appendChild(content);
    card.appendChild(deleteBtn);

    return card;
  }

  deleteCard(cardElement) {
    const columnElement = cardElement.closest('.column');
    const { column } = columnElement.dataset;
    const cardContent = cardElement.querySelector('.card-content').textContent;

    this.columns[column] = this.columns[column].filter((text) => text !== cardContent);
    cardElement.remove();
    this.saveAndUpdate();
  }

  addCardToColumn(columnId, text, save = true) {
    if (!text.trim()) return;

    this.columns[columnId].push(text);
    const container = document.querySelector(`[data-column="${columnId}"] .cards-container`);
    container.appendChild(this.createCardElement(text));

    if (save) {
      this.saveAndUpdate();
    }
  }

  updateColumnData() {
    ['todo', 'inProgress', 'done'].forEach((columnId) => {
      const container = document.querySelector(`[data-column="${columnId}"] .cards-container`);
      const cards = Array.from(container.querySelectorAll('.card .card-content'));
      this.columns[columnId] = cards.map((card) => card.textContent);
    });
    this.saveAndUpdate();
  }

  saveAndUpdate() {
    Storage.saveBoardData(this.columns);
    this.updateCardCounts();
  }

  updateCardCounts() {
    ['todo', 'inProgress', 'done'].forEach((columnId) => {
      const countElement = document.querySelector(`[data-column="${columnId}"] .card-count`);
      countElement.textContent = `${this.columns[columnId].length} cards`;
    });
  }

  setupEventListeners() {
    document.querySelectorAll('.add-another-btn').forEach((btn) => {
      const button = btn;
      button.onclick = (e) => {
        const addCardSection = e.target.closest('.add-card');
        const textarea = addCardSection.querySelector('.card-input');
        const controls = addCardSection.querySelector('.add-card-controls');
        const addAnotherBtn = addCardSection.querySelector('.add-another-btn');

        textarea.style.display = 'block';
        controls.style.display = 'flex';
        addAnotherBtn.style.display = 'none';
        textarea.focus();
      };
    });

    document.querySelectorAll('.cancel-card-btn').forEach((btn) => {
      const button = btn;
      button.onclick = (e) => {
        const addCardSection = e.target.closest('.add-card');
        const textarea = addCardSection.querySelector('.card-input');
        const controls = addCardSection.querySelector('.add-card-controls');
        const addAnotherBtn = addCardSection.querySelector('.add-another-btn');

        textarea.value = '';
        textarea.style.display = 'none';
        controls.style.display = 'none';
        addAnotherBtn.style.display = 'block';
      };
    });

    document.querySelectorAll('.add-card-btn').forEach((btn) => {
      const button = btn;
      button.onclick = (e) => {
        const addCardSection = e.target.closest('.add-card');
        const textarea = addCardSection.querySelector('.card-input');
        const columnElement = addCardSection.closest('.column');
        const { column } = columnElement.dataset;

        if (textarea.value.trim()) {
          this.addCardToColumn(column, textarea.value.trim());
          textarea.value = '';

          textarea.style.display = 'none';
          addCardSection.querySelector('.add-card-controls').style.display = 'none';
          addCardSection.querySelector('.add-another-btn').style.display = 'block';
        }
      };
    });

    const clearAllBtn = document.getElementById('clear-all');
    clearAllBtn.onclick = () => {
      if (confirm('Are you sure you want to clear all cards? This cannot be undone.')) {
        this.columns = Storage.clearAllData();
        this.renderBoard();
        this.saveAndUpdate();
      }
    };

    document.querySelectorAll('.card-input').forEach((input) => {
      const textarea = input;
      textarea.onkeydown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          const addCardSection = textarea.closest('.add-card');
          const addBtn = addCardSection.querySelector('.add-card-btn');
          addBtn.click();
        }
      };
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new TrelloApp();
});
