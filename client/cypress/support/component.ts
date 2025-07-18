// ***********************************************************
// This example support/component.ts is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import "./commands";

import { mount } from "cypress/react";
import { db } from "../../src/db";

// Augment the Cypress namespace to include type definitions for
// your custom command.
// Alternatively, can be defined in cypress/support/component.d.ts
// with a <reference path="./component" /> at the top of your spec.
declare global {
  namespace Cypress {
    interface Chainable {
      mount: typeof mount;
    }
  }
}

Cypress.Commands.add("mount", mount);

// Example use:
// cy.mount(<MyComponent />)

// Before each test, setup `currentUser` to prevent navbar from displaying sign-in button (Cypress clears localstorage before each test by default)
beforeEach(() => {
  localStorage.setItem("currentUser", "test-user");
});

// After each test, clear dexie data; otherwise, data from previous tests can linger (Cypress does not clear this automatically)
afterEach(() => {
  cy.then(() => {
    db.notes.clear();
    db.user.clear();
  });
});
