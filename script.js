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

/** id задачи, которая сейчас редактируется (или null) */
let editingId = null;

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

function deleteTask(id) {
  tasks = tasks.filter((task) => task.id !== id);
  renderTasks();
}

function toggleTask(id) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;
  task.done = !task.done;
  renderTasks();
}

function updateTask(id, changes) {
  const task = tasks.find((item) => item.id === id);
  if (!task) return;
  Object.assign(task, changes);
  editingId = null;
  renderTasks();
}

function startEditing(id) {
  editingId = id;
  renderTasks();
  const input = ui.list.querySelector('.task-edit__title');
  if (input) {
    input.focus();
    input.select();
  }
}

function cancelEditing() {
  editingId = null;
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

/** Форма редактирования, которая встаёт на место текста задачи */
function createEditForm(task) {
  const titleInput = createElement('input', {
    className: 'field__input task-edit__title',
    attrs: { type: 'text', name: 'title', maxlength: '120', required: '', 'aria-label': 'Новое название' },
  });
  titleInput.value = task.title;

  const dateInput = createElement('input', {
    className: 'field__input task-edit__date',
    attrs: { type: 'date', name: 'date', 'aria-label': 'Новая дата' },
  });
  dateInput.value = task.date;

  return createElement('form', { className: 'task-edit', attrs: { 'data-form': 'edit' } },
    titleInput,
    dateInput,
    createElement('div', { className: 'task-edit__buttons' },
      createElement('button', {
        className: 'button button--primary button--small',
        text: 'Сохранить',
        attrs: { type: 'submit' },
      }),
      createElement('button', {
        className: 'button button--ghost button--small',
        text: 'Отмена',
        attrs: { type: 'button', 'data-action': 'cancel' },
      }),
    ),
  );
}

function createTaskElement(task) {
  if (task.id === editingId) {
    return createElement('li', { className: 'task-item task-item--editing', attrs: { 'data-id': task.id } },
      createEditForm(task));
  }

  const title = createElement('p', { className: 'task-item__title', text: task.title });
  const date = createElement('time', {
    className: 'task-item__date',
    text: formatDate(task.date),
    attrs: task.date ? { datetime: task.date } : {},
  });

  const checkbox = createElement('input', {
    className: 'task-item__check',
    attrs: { type: 'checkbox', 'data-action': 'toggle', 'aria-label': 'Отметить как выполненную' },
  });
  checkbox.checked = task.done;

  const body = createElement('div', { className: 'task-item__body' }, title, date);

  const deleteButton = createElement('button', {
    className: 'button button--ghost button--danger button--small',
    text: 'Удалить',
    attrs: { type: 'button', 'data-action': 'delete' },
  });
  const editButton = createElement('button', {
    className: 'button button--ghost button--small',
    text: 'Изменить',
    attrs: { type: 'button', 'data-action': 'edit' },
  });
  const actions = createElement('div', { className: 'task-item__actions' }, editButton, deleteButton);

  const item = createElement('li', { className: 'task-item', attrs: { 'data-id': task.id } },
    checkbox, body, actions);
  item.classList.toggle('task-item--done', task.done);
  return item;
}

function renderTasks() {
  ui.list.replaceChildren(...tasks.map(createTaskElement));

  const doneCount = tasks.filter((task) => task.done).length;
  ui.emptyMessage.hidden = tasks.length > 0;
  ui.counter.textContent = `Всего: ${tasks.length} · Выполнено: ${doneCount}`;
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

/** Делегирование событий: один обработчик на весь список */
function handleListClick(event) {
  const actionElement = event.target.closest('[data-action]');
  if (!actionElement) return;

  const item = actionElement.closest('.task-item');
  const { id } = item.dataset;

  switch (actionElement.dataset.action) {
    case 'toggle':
      toggleTask(id);
      break;
    case 'delete':
      deleteTask(id);
      break;
    case 'edit':
      startEditing(id);
      break;
    case 'cancel':
      cancelEditing();
      break;
    default:
      break;
  }
}

/** Сохранение формы редактирования (событие submit всплывает до списка) */
function handleListSubmit(event) {
  if (event.target.dataset.form !== 'edit') return;
  event.preventDefault();

  const form = event.target;
  const { id } = form.closest('.task-item').dataset;
  const title = form.elements.title.value.trim();
  if (!title) {
    form.elements.title.focus();
    return;
  }

  updateTask(id, { title, date: form.elements.date.value });
}

function handleListKeydown(event) {
  if (event.key === 'Escape' && editingId) {
    cancelEditing();
  }
}

function bindEvents() {
  ui.form.addEventListener('submit', handleFormSubmit);
  ui.list.addEventListener('click', handleListClick);
  ui.list.addEventListener('submit', handleListSubmit);
  ui.list.addEventListener('keydown', handleListKeydown);
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
