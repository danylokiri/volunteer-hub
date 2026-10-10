// Test/Debug-screen wrapper. Holds a real `DeepLinkRouter` and forwards
// every input through `feed(url)` -> `handle(url)`. The wrapper exists
// so the Debug Screen never has to know about the auth-gating /
// navigation-ref details: it just feeds URLs.

import { Destination } from '../domain/destinations/Destination';
import { DeepLinkRouter } from './DeepLinkRouter';

export class MockDeepLinkRouter {
  constructor(private inner: DeepLinkRouter) {}

  feed(url: string): Destination | null {
    return this.inner.handle(url);
  }
}
