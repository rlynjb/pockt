export type NotionClientLike = {
  dataSources: {
    query(args: Record<string, unknown>): Promise<{
      results: unknown[];
      has_more?: boolean;
      next_cursor?: string | null;
    }>;
  };
  pages: {
    create(args: Record<string, unknown>): Promise<unknown>;
    update(args: Record<string, unknown>): Promise<unknown>;
    retrieve?(args: Record<string, unknown>): Promise<unknown>;
  };
};

export type NotionRepositoryConfig = {
  habitsDataSourceId: string;
  completionsDataSourceId: string;
};
