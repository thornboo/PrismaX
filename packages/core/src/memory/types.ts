export type CoreMemoryLabel = string;

export type CoreMemory = {
  assistantId: string;
  label: CoreMemoryLabel;
  content: string;
  lastUpdated: Date;
};

export type ArchivalMemorySearchResult = {
  id: string;
  assistantId: string;
  content: string;
  score: number;
  createdAt: Date;
};

export interface IMemoryProvider {
  getCoreMemory(input: {
    assistantId: string;
    label: CoreMemoryLabel;
  }): Promise<CoreMemory | null>;

  updateCoreMemory(input: {
    assistantId: string;
    label: CoreMemoryLabel;
    content: string;
  }): Promise<CoreMemory>;

  searchArchivalMemory(input: {
    assistantId: string;
    query: string;
    limit?: number;
  }): Promise<ArchivalMemorySearchResult[]>;
}

