import { describe, it, expect } from "vitest";
import { composeFoundMatchEmail } from "./notifications";

describe("composeFoundMatchEmail", () => {
  it("builds subject with category and includes title", () => {
    const { subject, html } = composeFoundMatchEmail({
      title: "Blue Backpack",
      category: "Bags & Backpacks",
      description: "Navy blue, front pocket zipper broken",
      location: "Library",
    });
    expect(subject).toContain("Bags & Backpacks");
    expect(html).toContain("Blue Backpack");
    expect(html).toContain("Library");
  });
});
