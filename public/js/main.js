import { App } from './modules/Core/App.js';

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
    window.app = app; // Expose for testing
});
