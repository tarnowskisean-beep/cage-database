export interface ChartDataPoint {
    name: string;
    amount: number;
    count: number;
    color?: string;
}

export interface AuditLog {
    AuditID: number;
    Action: string;
    CreatedAt: string;
    Details: string;
    Actor: string;
}

export interface DistributionData {
    name: string;
    count: number;
    total: number;
}

export interface ClientStat {
    ClientName: string;
    total: number;
    // include other fields if necessary from the API join
    [key: string]: any;
}

export interface DashboardStats {
    // KPIs
    totalValidAmount: number;
    totalRevenue: number;
    openBatches: number;
    closedBatches: number;
    uniqueDonors: number;

    // Charts
    chartData: ChartDataPoint[];

    // Lists
    recentLogs: AuditLog[];
    byClient: ClientStat[];
    byMethod: DistributionData[];
    byPlatform: DistributionData[];
}
