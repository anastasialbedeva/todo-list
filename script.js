'use strict';

/* ==========================================================================
   Хелперы для работы с DOM
   ========================================================================== */

/**
 * Создаёт DOM-элемент.
 * @param {string} tag — имя тега
 * @param {{className?: string, text?: string, attrs?: Object}} options
 * @param {...Node} children — дочерние элементы
 */
function createElement(tag, { className, text, attrs } = {}, ...children) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  if (attrs) {
    Object.entries(attrs).forEach(([name, value]) => element.setAttribute(name, value));
  }
  element.append(...children);
  return element;
}

/** Поле с подписью: <label><span>Текст</span>[control]</label> */
function createField(labelText, control) {
  return createElement('label', { className: 'field' },
    createElement('span', { className: 'field__label', text: labelText }),
    control,
  );
}

/** Выпадающий список из пар [value, text] */
function createSelect(options) {
  const select = createElement('select', { className: 'field__input' });
  options.forEach(([value, text]) => {
    select.append(createElement('option', { text, attrs: { value } }));
  });
  return select;
}

/* ==========================================================================
   Разметка страницы
   ========================================================================== */

// Ссылки на элементы, которые понадобятся логике приложения
const ui = {};

function buildHeader() {
  return createElement('header', { className: 'app-header' },
    createElement('h1', { className: 'app-header__title', text: 'To-Do List' }),
    createElement('p', {
      className: 'app-header__subtitle',
      text: 'Планируйте дела, отмечайте выполненные и меняйте порядок перетаскиванием',
    }),
  );
}

function buildFormSection() {
  ui.titleInput = createElement('input', {
    className: 'field__input',
    attrs: { type: 'text', name: 'title', placeholder: 'Что нужно сделать?', maxlength: '120', required: '' },
  });
  ui.dateInput = createElement('input', {
    className: 'field__input',
    attrs: { type: 'date', name: 'date' },
  });
  const submitButton = createElement('button', {
    className: 'button button--primary task-form__submit',
    text: 'Добавить',
    attrs: { type: 'submit' },
  });

  ui.form = createElement('form', { className: 'task-form', attrs: { autocomplete: 'off' } },
    createField('Задача', ui.titleInput),
    createField('Дата', ui.dateInput),
    submitButton,
  );

  return createElement('section', { className: 'panel', attrs: { 'aria-labelledby': 'form-title' } },
    createElement('h2', { className: 'panel__title', text: 'Новая задача', attrs: { id: 'form-title' } }),
    ui.form,
  );
}

function buildControlsSection() {
  ui.searchInput = createElement('input', {
    className: 'field__input',
    attrs: { type: 'search', placeholder: 'Поиск по названию…' },
  });
  ui.filterSelect = createSelect([
    ['all', 'Все'],
    ['active', 'Невыполненные'],
    ['done', 'Выполненные'],
  ]);
  ui.sortSelect = createSelect([
    ['manual', 'Свой порядок'],
    ['date-asc', 'Дата: сначала ранние'],
    ['date-desc', 'Дата: сначала поздние'],
  ]);

  return createElement('section', { className: 'panel', attrs: { 'aria-labelledby': 'controls-title' } },
    createElement('h2', { className: 'panel__title', text: 'Поиск и фильтры', attrs: { id: 'controls-title' } }),
    createElement('div', { className: 'controls' },
      createField('Поиск', ui.searchInput),
      createField('Статус', ui.filterSelect),
      createField('Сортировка', ui.sortSelect),
    ),
  );
}

function buildListSection() {
  ui.counter = createElement('p', { className: 'counter' });
  ui.list = createElement('ul', { className: 'task-list' });
  ui.emptyMessage = createElement('p', { className: 'empty-message', text: 'Задач пока нет' });

  return createElement('section', { className: 'panel panel--list', attrs: { 'aria-labelledby': 'list-title' } },
    createElement('div', { className: 'panel__head' },
      createElement('h2', { className: 'panel__title', text: 'Список задач', attrs: { id: 'list-title' } }),
      ui.counter,
    ),
    ui.list,
    ui.emptyMessage,
  );
}

function buildFooter() {
  return createElement('footer', { className: 'app-footer' },
    createElement('p', { text: `© ${new Date().getFullYear()} To-Do List · чистый JavaScript и DOM API` }),
  );
}

/** Подключаем стили через JS, чтобы в HTML был только скрипт */
function loadStyles() {
  const link = createElement('link', { attrs: { rel: 'stylesheet', href: 'style.css' } });
  document.head.append(link);
}

function buildLayout() {
  document.title = 'To-Do List';
  loadStyles();

  const main = createElement('main', { className: 'app-main' },
    buildFormSection(),
    buildControlsSection(),
    buildListSection(),
  );

  const app = createElement('div', { className: 'app' }, buildHeader(), main, buildFooter());
  document.body.append(app);
}

/* ==========================================================================
   Состояние приложения
   ========================================================================== */

/**
 * @typedef {Object} Task
 * @property {string} id
 * @property {string} title
 * @property {string} date — дата в формате YYYY-MM-DD или пустая строка
 * @property {boolean} done
 * @property {number} createdAt
 */

/** @type {Task[]} — порядок в массиве = пользовательский порядок задач */
let tasks = [];

function generateId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function addTask(title, date) {
  tasks.push({
    id: generateId(),
    title,
    date,
    done: false,
    createdAt: Date.now(),
  });
  renderTasks();
}

/* ==========================================================================
   Отрисовка задач
   ========================================================================== */

function formatDate(isoDate) {
  if (!isoDate) return 'Без даты';
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function createTaskElement(task) {
  const title = createElement('p', { className: 'task-item__title', text: task.title });
  const date = createElement('time', {
    className: 'task-item__date',
    text: formatDate(task.date),
    attrs: task.date ? { datetime: task.date } : {},
  });

  const body = createElement('div', { className: 'task-item__body' }, title, date);

  return createElement('li', { className: 'task-item', attrs: { 'data-id': task.id } }, body);
}

function renderTasks() {
  ui.list.replaceChildren(...tasks.map(createTaskElement));

  ui.emptyMessage.hidden = tasks.length > 0;
  ui.counter.textContent = `Всего задач: ${tasks.length}`;
}

/* ==========================================================================
   Обработчики событий
   ========================================================================== */

function handleFormSubmit(event) {
  event.preventDefault();
  const title = ui.titleInput.value.trim();
  if (!title) {
    ui.titleInput.value = '';
    ui.titleInput.focus();
    return;
  }

  addTask(title, ui.dateInput.value);
  ui.form.reset();
  ui.titleInput.focus();
}

function bindEvents() {
  ui.form.addEventListener('submit', handleFormSubmit);
}

/* ==========================================================================
   Запуск
   ========================================================================== */

function init() {
  buildLayout();
  bindEvents();
  renderTasks();
}

document.addEventListener('DOMContentLoaded', init);
