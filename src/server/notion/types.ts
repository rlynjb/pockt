export type NotionClientLike = {
  databases: {
    query(args: Record<string, unknown>): Promise<{ results: unknown[] }>;
  };
  pages: {
    create(args: Record<string, unknown>): Promise<unknown>;
    update(args: Record<string, unknown>): Promise<unknown>;
    retrieve?(args: Record<string, unknown>): Promise<unknown>;
  };
};

export type NotionRepositoryConfig = {
  habitsDatabaseId: string;
  completionsDatabaseId: string;
};
