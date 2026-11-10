/* =====================================================
   ADVANCED TO-DO LIST APPLICATION
   Version: 2.0
   Technology: Vanilla JavaScript
   Architecture: Modular Functions

   FEATURES:
   - Add, Edit, Delete Tasks
   - Complete / Pending Tasks
   - Priority Management
   - Categories
   - Search
   - Dark / Light Mode
   - Due Date Reminders
   - Drag & Drop
   - JSON / CSV Export
   - Filters and Statistics
   - Local Storage

===================================================== */


/* =====================================================
   01. CONFIGURATION
===================================================== */

const CONFIG = {

    storageKey: "advancedTodoTasks",

    themeKey: "advancedTodoTheme",

    defaultTheme: "dark",

    reminderHour: 9,

    maxTitleLength: 72,

    minTitleLength: 3,

    priorities: ["high", "medium", "low"],

    defaultCategory: "Other"

};


/* =====================================================
   02. DOM ELEMENTS
===================================================== */

const DOM = {

    form: document.querySelector("#todoForm")
        || document.querySelector(".form"),

    title: document.querySelector("#title"),

    date: document.querySelector("#date"),

    priority: document.querySelector("#priority"),

    category: document.querySelector("#category"),

    list: document.querySelector("#todoLists"),

    search: document.querySelector("#searchInput"),

    themeToggle: document.querySelector("#themeToggle"),

    totalCount: document.querySelector("#totalCount"),

    completedCount: document.querySelector("#completedCount"),

    pendingCount: document.querySelector("#pendingCount"),

    clearCompleted: document.querySelector("#clearCompleted"),

    cancelEdit: document.querySelector("#cancelEdit"),

    enableReminders: document.querySelector("#enableReminders"),

    exportJSON: document.querySelector("#exportJSON"),

    exportCSV: document.querySelector("#exportCSV"),

    filters: document.querySelectorAll("[data-filter]")

};


/* =====================================================
   03. APPLICATION STATE
===================================================== */

const State = {

    tasks: [],

    currentFilter: "all",

    searchQuery: "",

    editingId: null,

    reminderTimer: null,

    draggedTaskId: null

};


/* =====================================================
   04. UTILITY FUNCTIONS
===================================================== */

// Generate unique ID

function generateId() {

    if (
        window.crypto &&
        typeof window.crypto.randomUUID === "function"
    ) {

        return window.crypto.randomUUID();

    }

    return Date.now().toString(36) +
        Math.random().toString(36).slice(2);

}


// Get today's date in local timezone

function getTodayDate() {

    const now = new Date();

    const year = now.getFullYear();

    const month = String(
        now.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
        now.getDate()
    ).padStart(2, "0");

    return `${year}-${month}-${day}`;

}


// Validate date

function isValidDate(date) {

    if (!date) return true;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return false;
    }

    const parsed = new Date(date + "T00:00:00");

    return !Number.isNaN(parsed.getTime()) &&
        parsed.toISOString().slice(0, 10) === date;

}


// Format date

function formatDate(date) {

    if (!date) return "No due date";

    if (!isValidDate(date)) return "Invalid date";

    const parsed = new Date(date + "T00:00:00");

    return parsed.toLocaleDateString("en-US", {

        day: "numeric",

        month: "short",

        year: "numeric"

    });

}


// Safely get current time

function getReminderTime(date) {

    const reminderDate = new Date(
        date + "T" +
        String(CONFIG.reminderHour).padStart(2, "0") +
        ":00:00"
    );

    return reminderDate.getTime();

}


// Check whether a task is overdue

function isOverdue(task) {

    if (!task.date || task.completed) {
        return false;
    }

    return task.date < getTodayDate();

}


// Create DOM element

function createElement(tag, className, text) {

    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    if (text !== undefined) {
        element.textContent = text;
    }

    return element;

}


/* =====================================================
   05. LOCAL STORAGE
===================================================== */

function saveTasks() {

    try {

        localStorage.setItem(
            CONFIG.storageKey,
            JSON.stringify(State.tasks)
        );

        return true;

    } catch (error) {

        console.error("Storage Error:", error);

        showMessage(
            "Unable to save tasks. Browser storage may be full.",
            "error"
        );

        return false;

    }

}


function loadTasks() {

    try {

        const savedData = localStorage.getItem(
            CONFIG.storageKey
        );

        if (!savedData) {

            State.tasks = [];

            return;

        }

        const parsedData = JSON.parse(savedData);

        if (!Array.isArray(parsedData)) {

            State.tasks = [];

            return;

        }

        State.tasks = parsedData.map(function(task) {

            return {

                id: String(task.id || generateId()),

                title: String(task.title || "Untitled Task"),

                date: isValidDate(task.date)
                    ? task.date
                    : null,

                priority: CONFIG.priorities.includes(
                    task.priority
                )
                    ? task.priority
                    : "low",

                category: String(
                    task.category || CONFIG.defaultCategory
                ),

                completed: Boolean(task.completed),

                createdAt: task.createdAt ||
                    new Date().toISOString(),

                updatedAt: task.updatedAt || null,

                remindedFor: task.remindedFor || null

            };

        });

    } catch (error) {

        console.error("Loading Error:", error);

        State.tasks = [];

    }

}


/* =====================================================
   06. NOTIFICATION / MESSAGE SYSTEM
===================================================== */

function showMessage(message, type = "success") {

    const existing = document.querySelector(
        ".todo-message"
    );

    if (existing) {
        existing.remove();
    }

    const notification = createElement(
        "div",
        `todo-message ${type}`,
        message
    );

    notification.setAttribute("role", "status");

    document.body.appendChild(notification);

    // Automatically remove message

    window.setTimeout(function() {

        notification.remove();

    }, 3500);

}


/* =====================================================
   07. TASK OBJECT
===================================================== */

function createTask(data) {

    return {

        id: generateId(),

        title: data.title,

        date: data.date || null,

        priority: data.priority || "low",

        category: data.category ||
            CONFIG.defaultCategory,

        completed: false,

        createdAt: new Date().toISOString(),

        updatedAt: null,

        remindedFor: null

    };

}


/* =====================================================
   08. ADD TASK
===================================================== */

function addTask(data) {

    const task = createTask(data);

    State.tasks.unshift(task);

    saveTasks();

    renderTasks();

    scheduleReminders();

    showMessage("Task added successfully!");

}


/* =====================================================
   09. EDIT TASK
===================================================== */

function editTask(id) {

    const task = State.tasks.find(function(item) {

        return item.id === id;

    });

    if (!task) return;

    State.editingId = task.id;

    DOM.title.value = task.title;

    DOM.date.value = task.date || "";

    if (DOM.priority) {

        DOM.priority.value = task.priority;

    }

    if (DOM.category) {

        DOM.category.value = task.category;

    }

    const submitButton = DOM.form.querySelector(
        '[type="submit"]'
    );

    if (submitButton) {

        submitButton.textContent = "Update Task";

    }

    if (DOM.cancelEdit) {

        DOM.cancelEdit.hidden = false;

    }

    DOM.title.focus();

    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

}


// Cancel editing

function cancelEdit() {

    State.editingId = null;

    DOM.form.reset();

    const submitButton = DOM.form.querySelector(
        '[type="submit"]'
    );

    if (submitButton) {

        submitButton.textContent = "Add Task";

    }

    if (DOM.cancelEdit) {

        DOM.cancelEdit.hidden = true;

    }

}


// Update existing task

function updateTask(id, data) {

    const index = State.tasks.findIndex(function(task) {

        return task.id === id;

    });

    if (index === -1) return;

    const oldTask = State.tasks[index];

    State.tasks[index] = {

        ...oldTask,

        title: data.title,

        date: data.date || null,

        priority: data.priority,

        category: data.category,

        updatedAt: new Date().toISOString(),

        // Reset reminder if due date changes

        remindedFor: oldTask.date === data.date
            ? oldTask.remindedFor
            : null

    };

    cancelEdit();

    saveTasks();

    renderTasks();

    scheduleReminders();

    showMessage("Task updated successfully!");

}


/* =====================================================
   10. DELETE TASK
===================================================== */

function deleteTask(id) {

    const confirmed = window.confirm(
        "Are you sure you want to delete this task?"
    );

    if (!confirmed) return;

    State.tasks = State.tasks.filter(function(task) {

        return task.id !== id;

    });

    if (State.editingId === id) {

        cancelEdit();

    }

    saveTasks();

    renderTasks();

    scheduleReminders();

    showMessage("Task deleted successfully!");

}


/* =====================================================
   11. COMPLETE / UNCOMPLETE TASK
===================================================== */

function toggleTask(id) {

    State.tasks = State.tasks.map(function(task) {

        if (task.id === id) {

            return {

                ...task,

                completed: !task.completed,

                updatedAt: new Date().toISOString(),

                remindedFor: null

            };

        }

        return task;

    });

    saveTasks();

    renderTasks();

    scheduleReminders();

}


/* =====================================================
   12. TASK PRIORITY
===================================================== */

function getPriorityLabel(priority) {

    const labels = {

        high: "High Priority",

        medium: "Medium Priority",

        low: "Low Priority"

    };

    return labels[priority] || "Low Priority";

}


/* =====================================================
   13. TASK CATEGORIES
===================================================== */

function getCategoryLabel(category) {

    return category || CONFIG.defaultCategory;

}


/* =====================================================
   14. SEARCH TASKS
===================================================== */

function searchTasks(tasks) {

    const query = State.searchQuery
        .trim()
        .toLowerCase();

    if (!query) return tasks;

    return tasks.filter(function(task) {

        return (

            task.title.toLowerCase().includes(query) ||

            task.category.toLowerCase().includes(query) ||

            task.priority.toLowerCase().includes(query)

        );

    });

}


/* =====================================================
   15. FILTER TASKS
===================================================== */

function filterTasks() {

    let filtered = [...State.tasks];

    // Filter by completion

    if (State.currentFilter === "completed") {

        filtered = filtered.filter(function(task) {

            return task.completed;

        });

    }

    else if (State.currentFilter === "pending") {

        filtered = filtered.filter(function(task) {

            return !task.completed;

        });

    }

    // Search

    filtered = searchTasks(filtered);

    return filtered;

}


/* =====================================================
   16. CREATE TASK CARD
===================================================== */

function createTaskCard(task) {

    const card = createElement(
        "article",
        "todo-item"
    );

    card.dataset.id = task.id;

    card.draggable = (
        State.currentFilter === "all" &&
        !State.searchQuery
    );

    if (task.completed) {

        card.classList.add("completed");

    }

    if (isOverdue(task)) {

        card.classList.add("overdue");

    }


    // Task content

    const content = createElement(
        "div",
        "content"
    );


    // Checkbox

    const checkbox = document.createElement("input");

    checkbox.type = "checkbox";

    checkbox.className = "task-checkbox";

    checkbox.checked = task.completed;

    checkbox.setAttribute(
        "aria-label",
        "Mark task as completed"
    );


    // Title

    const title = createElement(
        "h3",
        "task-title",
        task.title
    );


    // Category

    const category = createElement(
        "span",
        "task-category",
        getCategoryLabel(task.category)
    );


    // Priority

    const priority = createElement(
        "span",
        `task-priority priority-${task.priority}`,
        getPriorityLabel(task.priority)
    );


    // Date

    const date = createElement(
        "p",
        "task-date",
        formatDate(task.date)
    );


    // Overdue label

    if (isOverdue(task)) {

        const overdueLabel = createElement(
            "span",
            "overdue-label",
            "Overdue"
        );

        content.appendChild(overdueLabel);

    }


    // Add content elements

    content.appendChild(checkbox);

    content.appendChild(title);

    content.appendChild(category);

    content.appendChild(priority);

    content.appendChild(date);


    // Action buttons

    const actions = createElement(
        "div",
        "action-btns"
    );


    // Edit button

    const editButton = createElement(
        "button",
        "btn btn-edit",
        "Edit"
    );

    editButton.type = "button";

    editButton.dataset.action = "edit";


    // Delete button

    const deleteButton = createElement(
        "button",
        "btn btn-delete",
        "Delete"
    );

    deleteButton.type = "button";

    deleteButton.dataset.action = "delete";


    // Append buttons

    actions.appendChild(editButton);

    actions.appendChild(deleteButton);


    // Final card

    card.appendChild(content);

    card.appendChild(actions);

    return card;

}


/* =====================================================
   17. RENDER TASKS
===================================================== */

function renderTasks() {

    if (!DOM.list) return;

    DOM.list.replaceChildren();

    const filteredTasks = filterTasks();

    if (filteredTasks.length === 0) {

        const emptyMessage = createElement(
            "p",
            "empty-message",
            State.searchQuery
                ? "No matching tasks found."
                : "No tasks available. Add your first task!"
        );

        DOM.list.appendChild(emptyMessage);

    }

    filteredTasks.forEach(function(task) {

        const card = createTaskCard(task);

        DOM.list.appendChild(card);

    });

    updateTaskCounts();

}


/* =====================================================
   18. EVENT DELEGATION
===================================================== */

function handleListClick(event) {

    const button = event.target.closest(
        "button[data-action]"
    );

    if (!button) return;

    const card = button.closest(".todo-item");

    if (!card) return;

    const id = card.dataset.id;

    const action = button.dataset.action;

    if (action === "edit") {

        editTask(id);

    }

    else if (action === "delete") {

        deleteTask(id);

    }

}


function handleCheckboxChange(event) {

    if (
        !event.target.classList.contains("task-checkbox")
    ) {

        return;

    }

    const card = event.target.closest(".todo-item");

    if (!card) return;

    toggleTask(card.dataset.id);

}


/* =====================================================
   19. TASK COUNTS / STATISTICS
===================================================== */

function updateTaskCounts() {

    const total = State.tasks.length;

    const completed = State.tasks.filter(function(task) {

        return task.completed;

    }).length;

    const pending = total - completed;


    if (DOM.totalCount) {

        DOM.totalCount.textContent = total;

    }

    if (DOM.completedCount) {

        DOM.completedCount.textContent = completed;

    }

    if (DOM.pendingCount) {

        DOM.pendingCount.textContent = pending;

    }

}


/* =====================================================
   20. FILTER BUTTONS
===================================================== */

function setupFilters() {

    DOM.filters.forEach(function(button) {

        button.addEventListener("click", function() {

            const filter = button.dataset.filter;

            if (
                !["all", "completed", "pending"].includes(filter)
            ) {

                return;

            }

            State.currentFilter = filter;

            DOM.filters.forEach(function(item) {

                item.classList.toggle(
                    "active",
                    item === button
                );

            });

            renderTasks();

        });

    });

}


/* =====================================================
   21. SEARCH EVENT
===================================================== */

function setupSearch() {

    if (!DOM.search) return;

    DOM.search.addEventListener("input", function() {

        State.searchQuery = DOM.search.value;

        renderTasks();

    });

}


/* =====================================================
   22. DARK / LIGHT MODE
===================================================== */

function applyTheme(theme) {

    if (!["dark", "light"].includes(theme)) {

        theme = CONFIG.defaultTheme;

    }

    document.documentElement.setAttribute(
        "data-theme",
        theme
    );

    document.documentElement.classList.toggle(
        "dark-mode",
        theme === "dark"
    );

    document.documentElement.classList.toggle(
        "light-mode",
        theme === "light"
    );

    try {

        localStorage.setItem(
            CONFIG.themeKey,
            theme
        );

    } catch (error) {

        console.error("Theme Storage Error:", error);

    }

    if (DOM.themeToggle) {

        DOM.themeToggle.textContent =
            theme === "dark"
                ? "Switch to Light Mode"
                : "Switch to Dark Mode";

        DOM.themeToggle.setAttribute(
            "aria-pressed",
            String(theme === "dark")
        );

    }

}


function setupTheme() {

    let savedTheme = CONFIG.defaultTheme;

    try {

        savedTheme = localStorage.getItem(
            CONFIG.themeKey
        ) || CONFIG.defaultTheme;

    } catch (error) {

        console.error("Theme Loading Error:", error);

    }

    applyTheme(savedTheme);

    if (!DOM.themeToggle) return;

    DOM.themeToggle.addEventListener("click", function() {

        const currentTheme = document.documentElement
            .getAttribute("data-theme");

        const newTheme = currentTheme === "dark"
            ? "light"
            : "dark";

        applyTheme(newTheme);

    });

}


/* =====================================================
   23. CLEAR COMPLETED TASKS
===================================================== */

function clearCompletedTasks() {

    const completedTasks = State.tasks.filter(function(task) {

        return task.completed;

    });

    if (completedTasks.length === 0) {

        showMessage("No completed tasks found.", "error");

        return;

    }

    const confirmed = window.confirm(
        "Are you sure you want to delete all completed tasks?"
    );

    if (!confirmed) return;

    State.tasks = State.tasks.filter(function(task) {

        return !task.completed;

    });

    saveTasks();

    renderTasks();

    scheduleReminders();

    showMessage("Completed tasks cleared!");

}


/* =====================================================
   24. DRAG AND DROP
===================================================== */

function setupDragAndDrop() {

    if (!DOM.list) return;


    // Drag Start

    DOM.list.addEventListener("dragstart", function(event) {

        const card = event.target.closest(".todo-item");

        if (!card || !card.draggable) return;

        State.draggedTaskId = card.dataset.id;

        card.classList.add("dragging");

        if (event.dataTransfer) {

            event.dataTransfer.effectAllowed = "move";

            event.dataTransfer.setData(
                "text/plain",
                State.draggedTaskId
            );

        }

    });


    // Drag Over

    DOM.list.addEventListener("dragover", function(event) {

        const card = event.target.closest(".todo-item");

        if (!card || !State.draggedTaskId) return;

        event.preventDefault();

        if (event.dataTransfer) {

            event.dataTransfer.dropEffect = "move";

        }

    });


    // Drop

    DOM.list.addEventListener("drop", function(event) {

        const targetCard = event.target.closest(".todo-item");

        if (!targetCard || !State.draggedTaskId) return;

        event.preventDefault();

        const draggedId = State.draggedTaskId;

        const targetId = targetCard.dataset.id;

        if (draggedId === targetId) return;

        const fromIndex = State.tasks.findIndex(function(task) {

            return task.id === draggedId;

        });

        const toIndex = State.tasks.findIndex(function(task) {

            return task.id === targetId;

        });

        if (fromIndex === -1 || toIndex === -1) return;

        // Reorder original array

        const movedTask = State.tasks.splice(
            fromIndex,
            1
        )[0];

        State.tasks.splice(
            toIndex,
            0,
            movedTask
        );

        saveTasks();

        renderTasks();

    });


    // Drag End

    DOM.list.addEventListener("dragend", function() {

        State.draggedTaskId = null;

        DOM.list.querySelectorAll(".dragging").forEach(
            function(card) {

                card.classList.remove("dragging");

            }
        );

    });

}


/* =====================================================
   25. DUE DATE REMINDERS
===================================================== */

/*
   Reminder time: 9:00 AM local time.

   IMPORTANT:
   Browser notifications require permission.
   The website must remain open for scheduled
   JavaScript reminders to execute.
*/


function enableNotifications() {

    if (!("Notification" in window)) {

        showMessage(
            "This browser does not support notifications.",
            "error"
        );

        return;

    }

    Notification.requestPermission().then(function(permission) {

        if (permission === "granted") {

            showMessage("Task reminders enabled!");

            scheduleReminders();

        }

        else {

            showMessage(
                "Notification permission was not granted.",
                "error"
            );

        }

    }).catch(function(error) {

        console.error("Notification Error:", error);

        showMessage(
            "Unable to enable notifications.",
            "error"
        );

    });

}


// Send a reminder

function sendReminder(task) {

    if (
        !("Notification" in window) ||
        Notification.permission !== "granted"
    ) {

        return false;

    }

    try {

        const notification = new Notification(
            "To-Do List Reminder",
            {

                body: `Task due today: ${task.title}`,

                tag: `todo-${task.id}`

            }
        );

        notification.onclick = function() {

            window.focus();

            notification.close();

        };

        return true;

    } catch (error) {

        console.error("Reminder Error:", error);

        return false;

    }

}


// Check today's reminders

function processDueReminders() {

    if (
        !("Notification" in window) ||
        Notification.permission !== "granted"
    ) {

        return;

    }

    const today = getTodayDate();

    let changed = false;

    State.tasks.forEach(function(task) {

        if (task.completed || !task.date) return;

        // Only remind on the due date

        if (task.date !== today) return;

        if (task.remindedFor === today) return;

        const sent = sendReminder(task);

        if (sent) {

            task.remindedFor = today;

            changed = true;

        }

    });

    if (changed) {

        saveTasks();

    }

}


// Schedule the next reminder

function scheduleReminders() {

    if (State.reminderTimer) {

        clearTimeout(State.reminderTimer);

        State.reminderTimer = null;

    }

    if (
        !("Notification" in window) ||
        Notification.permission !== "granted"
    ) {

        return;

    }

    processDueReminders();

    const now = Date.now();

    const today = getTodayDate();

    const upcomingReminders = State.tasks

        .filter(function(task) {

            return (

                !task.completed &&

                task.date &&

                task.date >= today &&

                task.remindedFor !== task.date

            );

        })

        .map(function(task) {

            return getReminderTime(task.date);

        })

        .filter(function(time) {

            return time > now;

        });

    if (upcomingReminders.length === 0) return;

    const nextReminder = Math.min(
        ...upcomingReminders
    );

    const delay = Math.min(
        nextReminder - now,
        2147480000
    );

    State.reminderTimer = window.setTimeout(function() {

        scheduleReminders();

    }, delay);

}


/* =====================================================
   26. EXPORT TASKS AS JSON
===================================================== */

function downloadFile(content, filename, mimeType) {

    const blob = new Blob(
        [content],
        { type: mimeType }
    );

    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");

    link.href = url;

    link.download = filename;

    document.body.appendChild(link);

    link.click();

    link.remove();

    window.setTimeout(function() {

        URL.revokeObjectURL(url);

    }, 1000);

}


function exportJSON() {

    const exportData = {

        application: "Advanced To-Do List",

        version: "2.0",

        exportedAt: new Date().toISOString(),

        totalTasks: State.tasks.length,

        tasks: State.tasks

    };

    const json = JSON.stringify(
        exportData,
        null,
        4
    );

    downloadFile(
        json,
        "todo-backup.json",
        "application/json"
    );

    showMessage("JSON backup exported!");

}


/* =====================================================
   27. EXPORT TASKS AS CSV
===================================================== */

function escapeCSV(value) {

    const text = String(value ?? "");

    return '"' + text.replace(/"/g, '""') + '"';

}


function exportCSV() {

    const headers = [

        "ID",

        "Title",

        "Date",

        "Priority",

        "Category",

        "Completed",

        "Created At",

        "Updated At"

    ];

    const rows = State.tasks.map(function(task) {

        return [

            task.id,

            task.title,

            task.date || "",

            task.priority,

            task.category,

            task.completed ? "Yes" : "No",

            task.createdAt,

            task.updatedAt || ""

        ];

    });

    const csv = [

        headers.map(escapeCSV).join(","),

        ...rows.map(function(row) {

            return row.map(escapeCSV).join(",");

        })

    ].join("\r\n");

    // UTF-8 BOM for spreadsheet compatibility

    downloadFile(
        "\uFEFF" + csv,
        "todo-tasks.csv",
        "text/csv;charset=utf-8"
    );

    showMessage("CSV file exported!");

}


/* =====================================================
   28. FORM VALIDATION
===================================================== */

function validateTask(data) {

    if (!data.title) {

        showMessage("Please enter a task title.", "error");

        return false;

    }

    if (
        data.title.length < CONFIG.minTitleLength ||
        data.title.length > CONFIG.maxTitleLength
    ) {

        showMessage(
            `Title must contain ${CONFIG.minTitleLength} to ${CONFIG.maxTitleLength} characters.`,
            "error"
        );

        return false;

    }

    if (!isValidDate(data.date)) {

        showMessage("Please enter a valid due date.", "error");

        return false;

    }

    if (!CONFIG.priorities.includes(data.priority)) {

        showMessage("Please select a valid priority.", "error");

        return false;

    }

    if (data.category.length > 40) {

        showMessage(
            "Category cannot exceed 40 characters.",
            "error"
        );

        return false;

    }

    return true;

}


/* =====================================================
   29. FORM SUBMISSION
===================================================== */

function setupForm() {

    DOM.form.addEventListener("submit", function(event) {

        event.preventDefault();

        const data = {

            title: DOM.title.value.trim(),

            date: DOM.date.value || null,

            priority: DOM.priority
                ? DOM.priority.value
                : "low",

            category: DOM.category
                ? DOM.category.value.trim() ||
                    CONFIG.defaultCategory
                : CONFIG.defaultCategory

        };

        if (!validateTask(data)) return;

        if (State.editingId) {

            updateTask(State.editingId, data);

        }

        else {

            addTask(data);

            DOM.form.reset();

        }

    });

}


/* =====================================================
   30. CONNECT ALL BUTTONS
===================================================== */

function setupEventListeners() {

    // Form

    setupForm();


    // Task list

    DOM.list.addEventListener(
        "click",
        handleListClick
    );

    DOM.list.addEventListener(
        "change",
        handleCheckboxChange
    );


    // Search

    setupSearch();


    // Filters

    setupFilters();


    // Theme

    setupTheme();


    // Drag and Drop

    setupDragAndDrop();


    // Clear completed

    if (DOM.clearCompleted) {

        DOM.clearCompleted.addEventListener(
            "click",
            clearCompletedTasks
        );

    }


    // Cancel edit

    if (DOM.cancelEdit) {

        DOM.cancelEdit.addEventListener(
            "click",
            cancelEdit
        );

    }


    // Enable reminders

    if (DOM.enableReminders) {

        DOM.enableReminders.addEventListener(
            "click",
            enableNotifications
        );

    }


    // JSON export

    if (DOM.exportJSON) {

        DOM.exportJSON.addEventListener(
            "click",
            exportJSON
        );

    }


    // CSV export

    if (DOM.exportCSV) {

        DOM.exportCSV.addEventListener(
            "click",
            exportCSV
        );

    }

}


/* =====================================================
   31. APPLICATION INITIALIZATION
===================================================== */

function initApp() {

    // Check essential HTML elements

    if (
        !DOM.form ||
        !DOM.title ||
        !DOM.date ||
        !DOM.list
    ) {

        console.error(
            "To-Do List Error: Required HTML elements are missing."
        );

        return;

    }

    // Load saved tasks

    loadTasks();


    // Connect events

    setupEventListeners();


    // Render saved tasks

    renderTasks();


    // Start reminders if permission already granted

    scheduleReminders();


    console.log(
        "Advanced To-Do List v2.0 initialized successfully!"
    );

}


// Start after HTML loads

if (document.readyState === "loading") {

    document.addEventListener(
        "DOMContentLoaded",
        initApp
    );

}

else {

    initApp();

}


/* =====================================================
   END OF ADVANCED TO-DO LIST APPLICATION
===================================================== */
