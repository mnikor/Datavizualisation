import type { Chart, InsertChart, UpdateChart } from '@shared/schema';

export interface IStorage {
  getCharts(): Promise<Chart[]>;
  getChart(id: number): Promise<Chart | undefined>;
  createChart(chart: InsertChart): Promise<Chart>;
  updateChart(id: number, updates: UpdateChart): Promise<Chart | undefined>;
  deleteChart(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private charts: Chart[] = [];
  private nextId = 1;

  constructor() {
    // Clear all data on startup so charts don't persist
    this.charts = [];
    this.nextId = 1;
  }

  async getCharts(): Promise<Chart[]> {
    return this.charts;
  }

  async getChart(id: number): Promise<Chart | undefined> {
    return this.charts.find(c => c.id === id);
  }

  async createChart(chart: InsertChart): Promise<Chart> {
    const newChart: Chart = {
      ...chart,
      id: this.nextId++
    };
    this.charts.push(newChart);
    return newChart;
  }

  async updateChart(id: number, updates: UpdateChart): Promise<Chart | undefined> {
    const index = this.charts.findIndex(c => c.id === id);
    if (index === -1) return undefined;
    
    this.charts[index] = { ...this.charts[index], ...updates };
    return this.charts[index];
  }

  async deleteChart(id: number): Promise<boolean> {
    const initialLength = this.charts.length;
    this.charts = this.charts.filter(c => c.id !== id);
    return this.charts.length < initialLength;
  }
}

export const storage = new MemStorage();
