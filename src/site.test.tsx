import { describe, it, expect, vi } from "vitest";
vi.mock("./lib/client", () => ({
  supabase: null,
  invoke: vi.fn(),
  errorMessage: (e: unknown) => (e instanceof Error ? e.message : "Error"),
}));
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { Landing } from "./pages/Landing";
import { Workspace } from "./pages/Workspace";
import { AuthProvider } from "./auth";
import { AuthScreen } from "./pages/Auth";
import { Chart } from "./components/ui";
describe("Tradexa web", () => {
  it("landing page has useful CTAs and an interactive FAQ", () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("link", { name: /Open your workspace/ }),
    ).toHaveAttribute("href", "/login");
    expect(
      screen.getByRole("link", { name: /Explore the platform/ }),
    ).toHaveAttribute("href", "/preview");
    const question = screen.getByRole("button", {
      name: "How is my identity verified?",
    });
    fireEvent.click(question);
    expect(question).toHaveAttribute("aria-expanded", "true");
    expect(
      screen.getByText(/A local model checks whether your upload/),
    ).toBeInTheDocument();
  });
  it("does not invent a portfolio curve when no data exists", () => {
    render(<Chart values={[]} />);
    expect(screen.getByText("Your story starts here")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
  it("public preview is clearly separate from a real account", async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/preview"]}>
          <Routes>
            <Route path="/preview/:tab?" element={<Workspace preview />} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );
    expect(
      screen.getByText(/Sample data. No real account/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "Workspace navigation" }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /Deposit.*Not enabled/ }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Deposit is not enabled",
    );
  });
  it("cannot turn missing configuration into successful sign-in", async () => {
    render(
      <AuthProvider>
        <MemoryRouter>
          <AuthScreen />
        </MemoryRouter>
      </AuthProvider>,
    );
    const input = await screen.findByRole("textbox", { name: "Email address" });
    fireEvent.change(input, { target: { value: "test@example.com" } });
    fireEvent.click(
      screen.getByRole("button", { name: /Continue with email/ }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "awaiting backend configuration",
    );
  });
  it("protects the real workspace even if opened directly", async () => {
    render(
      <AuthProvider>
        <MemoryRouter initialEntries={["/app"]}>
          <Routes>
            <Route path="/app" element={<Workspace />} />
            <Route path="/login" element={<p>Protected login route</p>} />
          </Routes>
        </MemoryRouter>
      </AuthProvider>,
    );
    await waitFor(() =>
      expect(screen.getByText("Protected login route")).toBeInTheDocument(),
    );
  });
});
