import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
const mocks = vi.hoisted(() => ({
  phase: "email_otp",
  verifyEmail: vi.fn(),
  refresh: vi.fn(),
  savePin: vi.fn(),
  verifyPin: vi.fn(),
}));
vi.mock("./auth", () => ({
  useAuth: () => ({
    phase: mocks.phase,
    user: { id: "browser-test-user", email: "test@example.com" },
    email: "test@example.com",
    identity: "not_started",
    verifyEmail: mocks.verifyEmail,
    refresh: mocks.refresh,
    resend: async () => {},
    signOut: vi.fn(),
  }),
}));
vi.mock("./lib/pin", () => ({
  savePin: mocks.savePin,
  verifyPin: mocks.verifyPin,
}));
vi.mock("./lib/client", () => ({
  supabase: null,
  invoke: vi.fn(),
  errorMessage: (e: unknown) => (e instanceof Error ? e.message : "Error"),
}));
import { AuthScreen } from "./pages/Auth";
function mount() {
  render(
    <MemoryRouter>
      <AuthScreen />
    </MemoryRouter>,
  );
}
describe("website passcode flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.phase = "email_otp";
    mocks.verifyEmail.mockImplementation(async () => {
      mocks.phase = "passcode_setup";
    });
    mocks.savePin.mockResolvedValue(undefined);
  });
  it("clears the email OTP before accepting a new passcode", async () => {
    mount();
    // pasting the whole code into the first box fills all six and verifies
    fireEvent.change(screen.getByLabelText("Digit 1"), {
      target: { value: "123456" },
    });
    await waitFor(() => expect(mocks.verifyEmail).toHaveBeenCalledWith("123456"));
    await screen.findByRole("heading", { name: "Make it personal." });
    for (const digit of "284619")
      fireEvent.click(screen.getByRole("button", { name: digit }));
    await waitFor(() =>
      expect(
        screen.getByRole("heading", { name: "Confirm your passcode." }),
      ).toBeInTheDocument(),
    );
  });
  it("supports keyboard setup, confirmation and save", async () => {
    mocks.phase = "passcode_setup";
    mount();
    fireEvent.change(screen.getByLabelText("Six-digit passcode"), {
      target: { value: "284619" },
    });
    await screen.findByRole("heading", { name: "Confirm your passcode." });
    fireEvent.change(screen.getByLabelText("Six-digit passcode"), {
      target: { value: "284619" },
    });
    await screen.findByRole("heading", { name: "Your access, secured." });
    expect(mocks.savePin).toHaveBeenCalledWith("browser-test-user", "284619");
  });
  it("rejects mismatched confirmation and allows another attempt", async () => {
    mocks.phase = "passcode_setup";
    mount();
    fireEvent.change(screen.getByLabelText("Six-digit passcode"), {
      target: { value: "284619" },
    });
    await screen.findByRole("heading", { name: "Confirm your passcode." });
    fireEvent.change(screen.getByLabelText("Six-digit passcode"), {
      target: { value: "284610" },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Passcodes did not match",
    );
    expect(mocks.savePin).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Six-digit passcode")).toHaveValue("");
  });
  it("only unlocks with the correct passcode and supports retry", async () => {
    mocks.phase = "locked";
    mocks.verifyPin.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mount();
    fireEvent.change(screen.getByLabelText("Six-digit passcode"), {
      target: { value: "284610" },
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Incorrect passcode",
    );
    expect(mocks.refresh).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Six-digit passcode"), {
      target: { value: "284619" },
    });
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalledWith(true));
  });
});
