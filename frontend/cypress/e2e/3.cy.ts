describe("Engrams Test", () => {
  beforeEach(function () {
    cy.loginByGoogleApi();
  });

  it("visits engrams", () => {
    cy.visit("/engrams");
    cy.contains("h1", "Engrams");
  });

  it("sees Starred", () => {
    cy.visit("/engrams");
    cy.contains("a", "Starred");
  });

  it("visits Starred", () => {
    cy.visit("/engrams");
    cy.contains("Starred").click();
    cy.contains("h1", "Starred");
  });
});
