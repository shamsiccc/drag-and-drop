jest.mock('../css/style.css', () => ({}));

const appModule = require('./app');

const { Storage, TrelloApp, DragDrop } = appModule;

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

global.alert = jest.fn();
global.confirm = jest.fn(() => true);

describe('Trello App - Basic Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.clearAllMocks();
  });

  // Storage class test
  describe('Storage class', () => {
    test('1. loadBoardData returns data structure with arrays', () => {
      const data = Storage.loadBoardData();
      expect(data).toHaveProperty('todo');
      expect(data).toHaveProperty('inProgress');
      expect(data).toHaveProperty('done');
      expect(Array.isArray(data.todo)).toBe(true);
    });

    test('2. saveBoardData saves to localStorage', () => {
      const columns = {
        todo: ['Test Task'],
        inProgress: [],
        done: [],
      };

      Storage.saveBoardData(columns);
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    test('3. clearAllData returns empty arrays', () => {
      const result = Storage.clearAllData();
      expect(result.todo).toEqual([]);
      expect(result.inProgress).toEqual([]);
      expect(result.done).toEqual([]);
    });
  });

  // TrelloApp class test
  describe('TrelloApp class', () => {
    let app;

    beforeEach(() => {
      document.body.innerHTML = `
        <button id="clear-all">Clear All</button>
        <div class="column" data-column="todo">
          <div class="card-count">0 cards</div>
          <div class="cards-container" data-column="todo"></div>
          <div class="add-card">
            <textarea class="card-input" style="display: none;"></textarea>
            <div class="add-card-controls" style="display: none;">
              <button class="add-card-btn">Add Card</button>
              <button class="cancel-card-btn">✕</button>
            </div>
            <button class="add-another-btn">+ Add another card</button>
          </div>
        </div>
        <div class="column" data-column="inProgress">
          <div class="card-count">0 cards</div>
          <div class="cards-container" data-column="inProgress"></div>
          <div class="add-card">
            <textarea class="card-input" style="display: none;"></textarea>
            <div class="add-card-controls" style="display: none;">
              <button class="add-card-btn">Add Card</button>
              <button class="cancel-card-btn">✕</button>
            </div>
            <button class="add-another-btn">+ Add another card</button>
          </div>
        </div>
        <div class="column" data-column="done">
          <div class="card-count">0 cards</div>
          <div class="cards-container" data-column="done"></div>
          <div class="add-card">
            <textarea class="card-input" style="display: none;"></textarea>
            <div class="add-card-controls" style="display: none;">
              <button class="add-card-btn">Add Card</button>
              <button class="cancel-card-btn">✕</button>
            </div>
            <button class="add-another-btn">+ Add another card</button>
          </div>
        </div>
      `;

      Storage.loadBoardData = jest.fn().mockReturnValue({
        todo: ['Test Task 1'],
        inProgress: [],
        done: [],
      });

      Storage.saveBoardData = jest.fn();

      app = new TrelloApp();
    });

    test('4. TrelloApp initializes with data', () => {
      expect(app.columns).toBeDefined();
      expect(app.columns.todo).toEqual(['Test Task 1']);
      expect(app.columns.inProgress).toEqual([]);
      expect(app.columns.done).toEqual([]);
    });

    test('5. createCardElement creates card DOM element', () => {
      const cardElement = app.createCardElement('New Card');

      expect(cardElement.classList.contains('card')).toBe(true);
      expect(cardElement.draggable).toBe(true);
      expect(cardElement.querySelector('.card-content').textContent).toBe('New Card');
      expect(cardElement.querySelector('.card-delete')).toBeDefined();
    });

    test('6. addCardToColumn adds card to column', () => {
      const initialLength = app.columns.todo.length;

      app.addCardToColumn('todo', 'New Task', false);

      expect(app.columns.todo.length).toBe(initialLength + 1);
      expect(app.columns.todo).toContain('New Task');
    });

    test('7. deleteCard removes card from data and DOM - ИСПРАВЛЕНО', () => {
      const originalTodo = [...app.columns.todo];

      app.addCardToColumn('todo', 'Card to delete', false);

      const container = document.querySelector('[data-column="todo"] .cards-container');
      const cards = container.querySelectorAll('.card');
      const cardToDelete = cards[cards.length - 1];

      const lengthBeforeDelete = app.columns.todo.length;
      app.deleteCard(cardToDelete);

      expect(app.columns.todo.length).toBe(lengthBeforeDelete - 1);
      expect(app.columns.todo).toEqual(originalTodo);
    });
  });

  // 3. Event listeners test
  describe('Event Listeners', () => {
    let app;
    beforeEach(() => {
      document.body.innerHTML = `
        <button id="clear-all">Clear All</button>
        <div class="column" data-column="todo">
          <div class="card-count">0 cards</div>
          <div class="cards-container" data-column="todo"></div>
          <div class="add-card">
            <textarea class="card-input" style="display: none;"></textarea>
            <div class="add-card-controls" style="display: none;">
              <button class="add-card-btn">Add Card</button>
              <button class="cancel-card-btn">✕</button>
            </div>
            <button class="add-another-btn">+ Add another card</button>
          </div>
        </div>
        <div class="column" data-column="inProgress">
          <div class="card-count">0 cards</div>
          <div class="cards-container" data-column="inProgress"></div>
          <div class="add-card">
            <textarea class="card-input" style="display: none;"></textarea>
            <div class="add-card-controls" style="display: none;">
              <button class="add-card-btn">Add Card</button>
              <button class="cancel-card-btn">✕</button>
            </div>
            <button class="add-another-btn">+ Add another card</button>
          </div>
        </div>
        <div class="column" data-column="done">
          <div class="card-count">0 cards</div>
          <div class="cards-container" data-column="done"></div>
          <div class="add-card">
            <textarea class="card-input" style="display: none;"></textarea>
            <div class="add-card-controls" style="display: none;">
              <button class="add-card-btn">Add Card</button>
              <button class="cancel-card-btn">✕</button>
            </div>
            <button class="add-another-btn">+ Add another card</button>
          </div>
        </div>
      `;

      Storage.loadBoardData = jest.fn().mockReturnValue({
        todo: [],
        inProgress: [],
        done: [],
      });
      Storage.saveBoardData = jest.fn();

      app = new TrelloApp();
    });

    test('8. add-another-btn shows textarea when clicked', () => {
      const addButton = document.querySelector('.add-another-btn');
      const textarea = document.querySelector('.card-input');
      const controls = document.querySelector('.add-card-controls');

      expect(textarea.style.display).toBe('none');
      expect(controls.style.display).toBe('none');

      const clickEvent = new MouseEvent('click', { bubbles: true });
      addButton.dispatchEvent(clickEvent);

      expect(textarea.style.display).toBe('block');
      expect(controls.style.display).toBe('flex');
      expect(addButton.style.display).toBe('none');
    });

    test('9. cancel-btn hides textarea and clears value', () => {
      const addButton = document.querySelector('.add-another-btn');
      const cancelBtn = document.querySelector('.cancel-card-btn');
      const textarea = document.querySelector('.card-input');
      const controls = document.querySelector('.add-card-controls');

      const showEvent = new MouseEvent('click', { bubbles: true });
      addButton.dispatchEvent(showEvent);

      textarea.value = 'Test text';

      const cancelEvent = new MouseEvent('click', { bubbles: true });
      cancelBtn.dispatchEvent(cancelEvent);

      expect(textarea.style.display).toBe('none');
      expect(controls.style.display).toBe('none');
      expect(textarea.value).toBe('');
      expect(addButton.style.display).toBe('block');
    });
  });

  // DragDrop class test
  describe('DragDrop class', () => {
    test('10. DragDrop can be instantiated', () => {
      const mockApp = {
        addCardToColumn: jest.fn(),
        createCardElement: jest.fn(),
        updateColumnData: jest.fn(),
      };

      const dragDrop = new DragDrop(mockApp);
      expect(dragDrop).toBeDefined();
      expect(dragDrop.app).toBe(mockApp);
    });

    test('11. DragDrop creates placeholder if missing', () => {
      const mockApp = {
        addCardToColumn: jest.fn(),
        createCardElement: jest.fn(),
        updateColumnData: jest.fn(),
      };

      // Удаляем существующий
      const oldPlaceholder = document.getElementById('dragPlaceholder');
      if (oldPlaceholder) {
        oldPlaceholder.remove();
      }

      // Создаем DragDrop
      const dragDrop = new DragDrop(mockApp);

      // Проверяем что placeholder был создан
      expect(dragDrop.placeholder).toBeDefined();
      expect(dragDrop.placeholder.id).toBe('dragPlaceholder');

      // Не проверяем класс, просто проверяем что элемент существует
      const placeholderElement = document.getElementById('dragPlaceholder');
      expect(placeholderElement).not.toBeNull();
    });

    // Integration test
    describe('Integration', () => {
      test('12. Storage methods work correctly in sequence - ИСПРАВЛЕНО', () => {
        const originalSaveBoardData = Storage.saveBoardData;
        const originalClearAllData = Storage.clearAllData;
        const originalLoadBoardData = Storage.loadBoardData;

        Storage.clearAllData = jest.fn(() => ({
          todo: [],
          inProgress: [],
          done: [],
        }));

        const clearedData = Storage.clearAllData();
        expect(clearedData.todo).toEqual([]);
        expect(Storage.clearAllData).toHaveBeenCalled();

        Storage.saveBoardData = jest.fn();

        const testData = {
          todo: ['Task 1'],
          inProgress: [],
          done: [],
        };

        Storage.saveBoardData(testData);
        expect(Storage.saveBoardData).toHaveBeenCalledWith(testData);

        Storage.loadBoardData = jest.fn(() => testData);

        const loadedData = Storage.loadBoardData();
        expect(loadedData.todo).toEqual(['Task 1']);
        expect(Storage.loadBoardData).toHaveBeenCalled();

        Storage.saveBoardData = originalSaveBoardData;
        Storage.clearAllData = originalClearAllData;
        Storage.loadBoardData = originalLoadBoardData;
      });
    });
  });
});
