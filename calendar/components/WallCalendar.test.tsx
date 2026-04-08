import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import WallCalendar from "@/components/WallCalendar";

describe("<WallCalendar />", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to Notes mode and only selects a range when enabled", async () => {
    const user = userEvent.setup();

    render(<WallCalendar initialMonth={new Date(2026, 3, 1)} />);

    expect(screen.getByRole("button", { name: "Notes" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();

    const day10 = screen.getByRole("button", { name: "April 10, 2026" });
    await user.click(day10);
    expect(day10).not.toHaveAttribute("aria-pressed");

    await user.click(screen.getByRole("button", { name: "Range" }));
    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "April 10, 2026" }));
    await user.click(screen.getByRole("button", { name: "April 14, 2026" }));

    expect(screen.getByRole("button", { name: "April 10, 2026" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "April 12, 2026" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("creates a dated note via the + modal and shows it with the correct date", async () => {
    const user = userEvent.setup();

    render(<WallCalendar initialMonth={new Date(2026, 3, 1)} />);

    await user.click(screen.getByRole("button", { name: "April 10, 2026" }));
    await user.click(screen.getByRole("button", { name: "Add note" }));

    expect(screen.getByRole("dialog", { name: /add note/i })).toBeInTheDocument();

    expect(screen.getByLabelText("Date")).toHaveValue("2026-04-10");

    await user.type(screen.getByLabelText("Title"), "Hiking plan");
    await user.type(screen.getByLabelText("Description"), "Sunrise trail + snacks");

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Hiking plan")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "April 10, 2026, 1 note" })).toBeInTheDocument();
  });

  it("allows editing and deleting a dated note", async () => {
    const user = userEvent.setup();

    render(<WallCalendar initialMonth={new Date(2026, 3, 1)} />);

    await user.click(screen.getByRole("button", { name: "April 10, 2026" }));
    await user.click(screen.getByRole("button", { name: "Add note" }));
    await user.type(screen.getByLabelText("Title"), "Coffee");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await user.click(screen.getByText("Coffee"));
    expect(screen.getByRole("dialog", { name: /edit note/i })).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Title"));
    await user.type(screen.getByLabelText("Title"), "Coffee (updated)");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
    expect(screen.getByText("Coffee (updated)")).toBeInTheDocument();

    await user.click(screen.getByText("Coffee (updated)"));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => {
      expect(screen.queryByText("Coffee (updated)")).not.toBeInTheDocument();
    });
  });

  it("persists dated notes across remount via localStorage", async () => {
    const user = userEvent.setup();

    const first = render(<WallCalendar initialMonth={new Date(2026, 3, 1)} />);

    await user.click(screen.getByRole("button", { name: "April 10, 2026" }));
    await user.click(screen.getByRole("button", { name: "Add note" }));
    await user.type(screen.getByLabelText("Title"), "Pack bags");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    await new Promise((r) => setTimeout(r, 450));

    first.unmount();

    render(<WallCalendar initialMonth={new Date(2026, 3, 1)} />);

    expect(screen.getByText("Pack bags")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "April 10, 2026, 1 note" })).toBeInTheDocument();
  });

  it("jumps to a different month via the month/year picker", async () => {
    const user = userEvent.setup();

    render(<WallCalendar initialMonth={new Date(2026, 3, 1)} />);

    expect(screen.getByText("April 2026")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Month and year" }));
    expect(screen.getByRole("dialog", { name: "Month and year" })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Month and year" })).not.toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Month and year" }));
    await user.click(screen.getByRole("button", { name: "May 2026" }));

    expect(screen.getByRole("heading", { name: "May 2026" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("dialog", { name: "Month and year" })).not.toBeInTheDocument();
    });
  });
});
