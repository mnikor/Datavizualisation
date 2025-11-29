import '@testing-library/jest-dom';
import { afterEach, beforeAll } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
});

beforeAll(() => {
  if (typeof window !== 'undefined') {
    const globalWindow = window as typeof window & {
      matchMedia?: (query: string) => MediaQueryList;
      ResizeObserver?: typeof ResizeObserver;
    };

    if (!globalWindow.matchMedia) {
      globalWindow.matchMedia = () => ({
        matches: false,
        media: '',
        onchange: null,
        addListener: () => undefined,
        removeListener: () => undefined,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        dispatchEvent: () => false,
      });
    }

    if (!globalWindow.ResizeObserver) {
      class ResizeObserverPolyfill {
        observe() {}
        unobserve() {}
        disconnect() {}
      }

      globalWindow.ResizeObserver = ResizeObserverPolyfill as unknown as typeof ResizeObserver;
    }
  }

  const defineSizeProp = (prop: 'offsetWidth' | 'offsetHeight', value: number) => {
    Object.defineProperty(HTMLElement.prototype, prop, {
      configurable: true,
      get() {
        return value;
      },
    });
  };

  defineSizeProp('offsetWidth', 800);
  defineSizeProp('offsetHeight', 600);

  if (!(SVGElement.prototype as unknown as { getBBox?: () => DOMRect }).getBBox) {
    Object.defineProperty(SVGElement.prototype, 'getBBox', {
      configurable: true,
      value: () => new DOMRect(0, 0, 100, 100),
    });
  }
});
