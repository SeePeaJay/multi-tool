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

/*
  * Before each test, clear dexie data in case data from previous tests linger (Cypress does not clear this automatically), then setup `currentUser` to prevent navbar from displaying sign-in button (Cypress clears localstorage before each test by default)
  * Clear data beforeEach instead of afterEach because it's possible to restart test suite before afterEach is called, allowing data from previous tests to linger
*/
beforeEach(() => {
  cy.then(() => db.notes.clear().then(() => db.user.clear())).then(() => {
    localStorage.setItem("currentUser", "test-user");
  });
});
