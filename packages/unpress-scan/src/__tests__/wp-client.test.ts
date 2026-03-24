import { describe, it, expect } from "vitest";
import { WpClient } from "../wp-client.js";

describe("WpClient", () => {
  it("constructs correct API URLs", () => {
    const client = new WpClient("https://example.com", "user:pass");
    expect(client.getManifestUrl()).toBe("https://example.com/wp-json/unpress/v1/manifest");
    expect(client.getHealthUrl()).toBe("https://example.com/wp-json/unpress/v1/health");
  });

  it("constructs auth header", () => {
    const client = new WpClient("https://example.com", "user:pass");
    const header = client.getAuthHeader();
    expect(header).toBe("Basic " + Buffer.from("user:pass").toString("base64"));
  });

  it("strips trailing slash from URL", () => {
    const client = new WpClient("https://example.com/", "user:pass");
    expect(client.getHealthUrl()).toBe("https://example.com/wp-json/unpress/v1/health");
  });
});
