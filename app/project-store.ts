export type TextProjectFile = {
  path: string;
  kind: "text";
  mimeType: string;
  content: string;
};

export type AssetProjectFile = {
  path: string;
  kind: "asset";
  mimeType: string;
  content: Blob;
};

export type ProjectFile = TextProjectFile | AssetProjectFile;

export type ProjectRecord = {
  id: string;
  name: string;
  entry: string;
  runtimeId: "three" | "p5";
  files: ProjectFile[];
  updatedAt: string;
  groupId?: string | null;
};

export type DraftRecord = {
  id: "current";
  projectId: string | null;
  name: string;
  entry: string;
  runtimeId: "three" | "p5";
  files: ProjectFile[];
  activePath: string;
  saved: boolean;
  workspaceId?: string | null;
  workspaceName?: string | null;
};

export type StoredChatFileAction = {
  type: "write" | "delete" | "move";
  path: string;
  to?: string;
  content?: string;
  mimeType?: string;
};

export type StoredChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  changes?: StoredChatFileAction[];
  autoApplied?: boolean;
  applied?: boolean;
  validationError?: string;
  critiques?: string[];
  usage?: { inputTokens: number; cachedInputTokens: number; outputTokens: number; reasoningOutputTokens: number; turns: number };
};

export type ChatConversationRecord = {
  id: string;
  title: string;
  threadId: string | null;
  projectId: string | null;
  projectName: string;
  messages: StoredChatMessage[];
  createdAt: string;
  updatedAt: string;
};

const DB_NAME = "jslife-projects-v2";
const DB_VERSION = 2;
const PROJECTS = "projects";
const DRAFT = "draft";
const CHAT_CONVERSATIONS = "chat-conversations";

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(PROJECTS)) database.createObjectStore(PROJECTS, { keyPath: "id" });
    if (!database.objectStoreNames.contains(DRAFT)) database.createObjectStore(DRAFT, { keyPath: "id" });
    if (!database.objectStoreNames.contains(CHAT_CONVERSATIONS)) database.createObjectStore(CHAT_CONVERSATIONS, { keyPath: "id" });
  };
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error("Could not open project storage"));
});

const requestResult = <T,>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error("Project storage request failed"));
});

export async function listProjects(): Promise<ProjectRecord[]> {
  const database = await openDatabase();
  try {
    const projects = await requestResult(database.transaction(PROJECTS, "readonly").objectStore(PROJECTS).getAll()) as ProjectRecord[];
    return projects.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } finally {
    database.close();
  }
}

export async function putProject(project: ProjectRecord): Promise<void> {
  const database = await openDatabase();
  try {
    await requestResult(database.transaction(PROJECTS, "readwrite").objectStore(PROJECTS).put(project));
  } finally {
    database.close();
  }
}

export async function removeProject(id: string): Promise<void> {
  const database = await openDatabase();
  try {
    await requestResult(database.transaction(PROJECTS, "readwrite").objectStore(PROJECTS).delete(id));
  } finally {
    database.close();
  }
}

export async function getDraft(): Promise<DraftRecord | null> {
  const database = await openDatabase();
  try {
    return await requestResult(database.transaction(DRAFT, "readonly").objectStore(DRAFT).get("current")) as DraftRecord | undefined ?? null;
  } finally {
    database.close();
  }
}

export async function putDraft(draft: DraftRecord): Promise<void> {
  const database = await openDatabase();
  try {
    await requestResult(database.transaction(DRAFT, "readwrite").objectStore(DRAFT).put(draft));
  } finally {
    database.close();
  }
}

export async function listChatConversations(): Promise<ChatConversationRecord[]> {
  const database = await openDatabase();
  try {
    const conversations = await requestResult(database.transaction(CHAT_CONVERSATIONS, "readonly").objectStore(CHAT_CONVERSATIONS).getAll()) as ChatConversationRecord[];
    return conversations.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  } finally {
    database.close();
  }
}

export async function putChatConversation(conversation: ChatConversationRecord): Promise<void> {
  const database = await openDatabase();
  try {
    await requestResult(database.transaction(CHAT_CONVERSATIONS, "readwrite").objectStore(CHAT_CONVERSATIONS).put(conversation));
  } finally {
    database.close();
  }
}

export async function removeChatConversation(id: string): Promise<void> {
  const database = await openDatabase();
  try {
    await requestResult(database.transaction(CHAT_CONVERSATIONS, "readwrite").objectStore(CHAT_CONVERSATIONS).delete(id));
  } finally {
    database.close();
  }
}
