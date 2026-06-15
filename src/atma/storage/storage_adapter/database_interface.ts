export interface DatabaseAdapter {
    execute(sql: string, bindValues?: unknown[]): Promise<void>;
    select<T>(sql: string, bindValues?: unknown[]): Promise<T[]>;
}
