import type { Manifest } from "@unpress/shared";
import { WpConnectionError } from "@unpress/shared";

export class WpClient {
  private baseUrl: string;
  private authToken: string;

  constructor(wpUrl: string, authToken: string) {
    this.baseUrl = wpUrl.replace(/\/+$/, "");
    this.authToken = authToken;
  }

  getManifestUrl(): string {
    return `${this.baseUrl}/wp-json/unpress/v1/manifest`;
  }

  getHealthUrl(): string {
    return `${this.baseUrl}/wp-json/unpress/v1/health`;
  }

  getAuthHeader(): string {
    return "Basic " + Buffer.from(this.authToken).toString("base64");
  }

  async checkHealth(): Promise<{ status: string; version: string; wp_version: string }> {
    const res = await fetch(this.getHealthUrl());
    if (!res.ok) {
      throw new WpConnectionError(`Health check returned ${res.status}`);
    }
    return res.json();
  }

  async fetchManifest(): Promise<Manifest> {
    const res = await fetch(this.getManifestUrl(), {
      headers: { Authorization: this.getAuthHeader() },
    });
    if (!res.ok) {
      if (res.status === 403) {
        throw new WpConnectionError("REST API returned 403 — plugin may not be verified yet");
      }
      throw new WpConnectionError(`Manifest fetch returned ${res.status}`);
    }
    return res.json();
  }
}
