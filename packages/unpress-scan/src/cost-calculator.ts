export interface CostEstimate {
  sanity: { plan: string; cost: number };
  vercel: { plan: string; cost: number };
  github: { plan: string; cost: number };
  total: number;
  fits_free_tier: boolean;
  wp_comparison_min: number;
  wp_comparison_max: number;
}

export function calculateCosts(site: { posts: number; pages: number; media: number }): CostEstimate {
  const totalContent = site.posts + site.pages;
  const totalMedia = site.media;

  const sanityCost = totalContent > 500 || totalMedia > 2000 ? 15 : 0;
  const vercelCost = totalContent > 1000 || totalMedia > 5000 ? 20 : 0;
  const githubCost = 0;
  const total = sanityCost + vercelCost + githubCost;

  const wpMin = totalContent > 500 ? 30 : 5;
  const wpMax = totalContent > 500 ? 80 : 25;

  return {
    sanity: { plan: sanityCost === 0 ? "Free" : "Growth ($15/mo)", cost: sanityCost },
    vercel: { plan: vercelCost === 0 ? "Free" : "Pro ($20/mo)", cost: vercelCost },
    github: { plan: "Free", cost: 0 },
    total,
    fits_free_tier: total === 0,
    wp_comparison_min: wpMin,
    wp_comparison_max: wpMax,
  };
}
