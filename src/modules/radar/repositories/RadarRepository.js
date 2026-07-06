import { MockRadarProvider } from "../providers/MockRadarProvider";

export class RadarRepository {
  constructor(provider = new MockRadarProvider()) {
    this.provider = provider;
  }

  setProvider(provider) {
    this.provider = provider || new MockRadarProvider();
  }

  async listOpportunities() {
    return this.provider.listOpportunities();
  }
}
