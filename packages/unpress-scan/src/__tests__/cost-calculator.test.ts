import { describe, it, expect } from "vitest";
import { calculateCosts } from "../cost-calculator.js";

describe("calculateCosts", () => {
  it("returns all free for small site", () => {
    const result = calculateCosts({ posts: 47, pages: 12, media: 230 });
    expect(result.total).toBe(0);
    expect(result.sanity.plan).toBe("Free");
    expect(result.vercel.plan).toBe("Free");
    expect(result.github.plan).toBe("Free");
    expect(result.fits_free_tier).toBe(true);
  });

  it("recommends paid plans for large site", () => {
    const result = calculateCosts({ posts: 2400, pages: 100, media: 8000 });
    expect(result.total).toBeGreaterThan(0);
    expect(result.fits_free_tier).toBe(false);
  });

  it("includes WP hosting comparison", () => {
    const result = calculateCosts({ posts: 2400, pages: 100, media: 8000 });
    expect(result.wp_comparison_min).toBeGreaterThan(0);
    expect(result.wp_comparison_max).toBeGreaterThan(result.wp_comparison_min);
  });
});
