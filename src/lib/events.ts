// Simple event emitter for triggering page refreshes

type EventCallback = () => void;

class PageRefreshEmitter {
  private listeners: Map<string, Set<EventCallback>> = new Map();

  subscribe(page: string, callback: EventCallback) {
    if (!this.listeners.has(page)) {
      this.listeners.set(page, new Set());
    }
    this.listeners.get(page)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.listeners.get(page)?.delete(callback);
    };
  }

  emit(page: string) {
    this.listeners.get(page)?.forEach(callback => callback());
  }
}

export const pageRefresh = new PageRefreshEmitter();








