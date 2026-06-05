export interface DatasetMetadata {
  frequency: string;
  unit: string;
  lastUpdated: string;
  observations: string | number;
  sourceUrl: string;
}

export interface ChartSeries {
  key: string;
  name: string;
  type: 'line' | 'bar';
  color: 'navy' | 'mint' | string;
}

export interface ChartPoint {
  label: string;
  [key: string]: string | number;
}

export interface Dataset {
  id?: string;
  title: string;
  description?: string;
  createdDaysAgo?: number;
  rowCount?: number;
  status?: string;
  sources: string[];
  metadata: DatasetMetadata;
  columns: string[];
  data: Record<string, string>[];
  chartSeries: ChartSeries[];
  chartData: ChartPoint[];
  processingTime?: string;
}

export interface SavedQuery {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  frequency: string;
  rawQuery: string;
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
  lastTested?: string;
  description?: string;
}