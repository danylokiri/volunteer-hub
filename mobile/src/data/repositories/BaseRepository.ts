// Tiny pub/sub helper shared by every repository. Repositories
// `emit()` after they mutate local state; the provider subscribes once
// per repository and re-reads from the bundle so React state stays
// in sync with both immediate writes and asynchronous API responses.

export type ChangeListener = () => void;

export class ChangeEmitter {
  private listeners = new Set<ChangeListener>();

  subscribe(listener: ChangeListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(): void {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch {
        // listener errors must never break the repository.
      }
    });
  }
}
