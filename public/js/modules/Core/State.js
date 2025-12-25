/**
 * State Management Module
 * Implements a simple Observer pattern
 */
export class State {
    constructor(initialState = {}) {
        this.data = new Proxy(initialState, {
            set: (target, property, value) => {
                target[property] = value;
                this.notify(property, value);
                return true;
            }
        });
        this.listeners = new Map();
    }

    /**
     * Subscribe to state changes
     * @param {string} property - The property to observe
     * @param {Function} callback - The callback function
     */
    subscribe(property, callback) {
        if (!this.listeners.has(property)) {
            this.listeners.set(property, new Set());
        }
        this.listeners.get(property).add(callback);
    }

    /**
     * Notify listeners of a change
     * @param {string} property 
     * @param {any} value 
     */
    notify(property, value) {
        if (this.listeners.has(property)) {
            this.listeners.get(property).forEach(callback => callback(value));
        }
    }

    /**
     * Get current state
     */
    get(property) {
        return this.data[property];
    }

    /**
     * Set state
     */
    set(property, value) {
        this.data[property] = value;
    }
}
