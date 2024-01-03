// https://on.cypress.io/api

describe("Root Test", () => {
  it("visits the app root url", () => {
    cy.visit("/");
    cy.contains("h1", "Multi-Tool");
  });
});
