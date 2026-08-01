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
  runtimeId: "three";
  files: ProjectFile[];
  updatedAt: string;
};

export type DraftRecord = Omit<ProjectRecord, "updatedAt"> & {
  activePath: string;
  saved: boolean;
};

const DB_NAME = "jslife-projects-v2";
const DB_VERSION = 1;
const PROJECTS = "projects";
const DRAFT = "draft";

const openDatabase = () => new Promise<IDBDatabase>((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(PROJECTS)) database.createObjectStore(PROJECTS, { keyPath: "id" });
    if (!database.objectStoreNames.contains(DRAFT)) database.createObjectStore(DRAFT, { keyPath: "id" });
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
    await requestResult(database.transaction(DRAFT, "readwrite").objectStore(DRAFT).put({ ...draft, id: "current" }));
  } finally {
    database.close();
  }
}
