export interface Dataset {
  id?: string;
  title: string;
  description?: string;
  sources: string[];
  processingTime?: string;
  warning?: string;
  metadata: {
    frequency: string;
    unit: string;
    lastUpdated: string;
    observations: string;
    sourceUrl: string;
  };
  columns: string[];
  data: Record<string, any>[];
  chartSeries: {
    key: string;
    name: string;
    type: "line" | "bar";
    color: string;
  }[];
  chartData: Record<string, any>[];
  rowCount?: number;
}

export interface SavedQuery {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  rawQuery: string;
  frequency: string;
}

export interface DownloadItem {
  id: string;
  filename: string;
  size: string;
  date: string;
  format: string;
}

export interface DataSource {
  id: string;
  name: string;
  code: string;
  speed: string;
  type: string;
  status: string;
  url: string;
  category: string;
  description: string;
  lastTested?: string;
}