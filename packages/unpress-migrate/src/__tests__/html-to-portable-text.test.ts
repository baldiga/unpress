import { describe, it, expect } from "vitest";
import { htmlToPortableText } from "../html-to-portable-text.js";

describe("htmlToPortableText", () => {
  it("converts simple paragraph", () => {
    const result = htmlToPortableText("<p>Hello world</p>");
    expect(result).toHaveLength(1);
    expect(result[0]._type).toBe("block");
  });

  it("converts heading", () => {
    const result = htmlToPortableText("<h2>My Heading</h2>");
    expect(result).toHaveLength(1);
    expect(result[0].style).toBe("h2");
  });

  it("converts image to custom block", () => {
    const result = htmlToPortableText('<img src="https://example.com/img.jpg" alt="Test">');
    expect(result.some((b: any) => b._type === "image" || b._type === "wpImage")).toBe(true);
  });

  it("converts list", () => {
    const result = htmlToPortableText("<ul><li>One</li><li>Two</li></ul>");
    expect(result.length).toBeGreaterThanOrEqual(2);
    expect(result[0].listItem).toBe("bullet");
  });

  it("handles empty input", () => {
    const result = htmlToPortableText("");
    expect(result).toEqual([]);
  });
});
