import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi } from "vitest";

vi.mock("next/image", () => ({
  __esModule: true,
  default: function NextImageMock(
    props: React.ComponentPropsWithoutRef<"img"> & { alt: string },
  ) {
    const rest = { ...(props as unknown as Record<string, unknown>) };
    delete rest.fill;
    delete rest.priority;
    delete rest.sizes;
    return React.createElement("img", rest);
  },
}));
