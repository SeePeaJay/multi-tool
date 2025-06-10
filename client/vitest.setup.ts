/* https://victorbruce82.medium.com/vitest-with-react-testing-library-in-react-created-with-vite-3552f0a9a19a */

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { Dexie } from "dexie";
import fakeIndexedDB from "fake-indexeddb";
import FDBKeyRange from "fake-indexeddb/lib/FDBKeyRange";
import { afterEach } from "vitest";

// provide an indexedDB implementation for testing environment (otherwise tests will throw Dexie error)
Dexie.dependencies.indexedDB = fakeIndexedDB;
Dexie.dependencies.IDBKeyRange = FDBKeyRange;

// provide stubs for layout APIs that aren't implemented by JSDOM (otherwise tests will throw undefined errors)
// https://github.com/ueberdosis/tiptap/discussions/4008#discussioncomment-7623655
class FakeDOMRectList extends Array<DOMRect> implements DOMRectList {
  item(index: number): DOMRect | null {
    return this[index];
  }
}

function getBoundingClientRect(): DOMRect {
  const rec = {
    x: 0,
    y: 0,
    bottom: 0,
    height: 0,
    left: 0,
    right: 0,
    top: 0,
    width: 0,
  };
  return { ...rec, toJSON: () => rec };
}

document.elementFromPoint = (): null => null;
document.elementsFromPoint = (): Element[] => []; // https://www.perplexity.ai/search/import-fireevent-render-screen-0SM.bhhMS3qtHb84Oxe6Mg#9
HTMLElement.prototype.getBoundingClientRect = getBoundingClientRect;
HTMLElement.prototype.getClientRects = (): DOMRectList => new FakeDOMRectList();
Range.prototype.getBoundingClientRect = getBoundingClientRect;
Range.prototype.getClientRects = (): DOMRectList => new FakeDOMRectList();

afterEach(() => {
  cleanup();
});
