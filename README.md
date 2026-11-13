# TODO-LIST Beast

A combined To-Do List application built with HTML, CSS, and Vanilla JavaScript.

## Features
- Add, edit, delete, complete and restore tasks
- All / Pending / Completed filters
- Task counts and completion progress
- Local Storage persistence
- Search by title, category, or priority
- Categories and High / Medium / Low priority
- Due dates and overdue labels
- Dark / Light theme
- Drag-and-drop task ordering (when viewing the unfiltered full list)
- JSON and CSV export
- Optional browser notifications for tasks due today
- Responsive desktop, tablet, and mobile UI
- Original TODO-LIST favicon and app mark from the supplied TODO-LIST-main archive
- Existing tasks are migrated from `advancedTodoTasks` or `taskflow_tasks_v1` the first time the app runs

## Run locally
1. Extract the ZIP.
2. Open the extracted `TODO-LIST-Beast` folder.
3. Double-click `index.html`.

No Node.js, framework, build step, or server is required. Google Fonts are optional; system fonts are used if offline.

## Storage and reminders
Tasks and theme are stored in this browser's Local Storage on this device. They do not sync between devices. Browser notifications require permission and the page must remain open; browsers may also restrict notifications on local `file://` pages. For reliable reminders, host the folder on HTTPS (for example, Vercel).

## Deploy
Upload the contents of this folder to a GitHub repository and import it into Vercel. Use the **Other** framework preset, with no build command and `.` as the output directory if requested.
