describe("Login Test", () => {
  beforeEach(function () {
    cy.loginByGoogleApi();
  });

  it("visits the login page", () => {
    cy.visit("/login");
    cy.contains("h1", "Login");
  });

  it("visits engrams", () => {
    cy.visit("/engrams");
    cy.contains("h1", "Engrams");
  });
});
