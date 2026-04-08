import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import WallCalendar from "@/components/WallCalendar";

describe("<WallCalendar />", () => {
  beforeEach(() => {
    window.localStorage.clear();
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

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
    expect(screen.getByText("Coffee (updated)")).toBeInTheDocument();

    await user.click(screen.getByText("Coffee (updated)"));
    await user.click(screen.getByRole("button", { name: "Delete" }));
    expect(screen.queryByText("Coffee (updated)")).not.toBeInTheDocument();
  });

  it("persists dated notes across remount via localStorage", async () => {
    const user = userEvent.setup();

    const first = render(<WallCalendar initialMonth={new Date(2026, 3, 1)} />);

    await user.click(screen.getByRole("button", { name: "April 10, 2026" }));
    await user.click(screen.getByRole("button", { name: "Add note" }));
    await user.type(screen.getByLabelText("Title"), "Pack bags");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await new Promise((r) => setTimeout(r, 450));

    first.unmount();

    render(<WallCalendar initialMonth={new Date(2026, 3, 1)} />);

    expect(screen.getByText("Pack bags")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "April 10, 2026, 1 note" })).toBeInTheDocument();
  });
});
