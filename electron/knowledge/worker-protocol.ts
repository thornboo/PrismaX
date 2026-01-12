export type KnowledgeWorkerRequest = {
  id: string;
  method: string;
  params: unknown;
};

export type KnowledgeWorkerResponse =
  | { id: string; ok: true; result: unknown }
  | { id: string; ok: false; error: { message: string; stack?: string } };

export type KnowledgeWorkerEvent = {
  type: "event";
  event: string;
  payload: unknown;
};
