import { vi } from "vitest";

export type SearchImplOptions = {
  onDebug?: (payload: unknown) => void;
  qmdSearchModeOverride?: string;
};
export type SearchImpl = (opts?: SearchImplOptions) => Promise<unknown[]>;
export type MemoryReadParams = { relPath: string; from?: number; lines?: number };
export type MemoryReadResult = { text: string; path: string };
type MemoryBackend = "builtin" | "qmd" | "mem0" | "hybrid";

let backend: MemoryBackend = "builtin";
let workspaceDir = "/workspace";
let searchImpl: SearchImpl = async () => [];
let readFileImpl: (params: MemoryReadParams) => Promise<MemoryReadResult> = async (params) => ({
  text: "",
  path: params.relPath,
});

const stubManager = {
  search: vi.fn(async (arg1?: unknown, arg2?: SearchImplOptions) => {
    const opts =
      typeof arg1 === "string" || arg1 === undefined ? arg2 : (arg1 as SearchImplOptions);
    return await searchImpl(opts);
  }),
  readFile: vi.fn(async (params: MemoryReadParams) => await readFileImpl(params)),
  status: () => ({
    backend,
    files: 1,
    chunks: 1,
    dirty: false,
    workspaceDir,
    dbPath: `${workspaceDir}/.memory/index.sqlite`,
    provider: "builtin",
    model: "builtin",
    requestedProvider: "builtin",
    sources: ["memory" as const],
    sourceCounts: [{ source: "memory" as const, files: 1, chunks: 1 }],
  }),
  sync: vi.fn(),
  probeVectorAvailability: vi.fn(async () => true),
  close: vi.fn(),
};

const getMemorySearchManagerMock = vi.fn(async (_params: { cfg?: unknown }) => ({
  manager: stubManager,
}));
const readAgentMemoryFileMock = vi.fn(
  async (params: MemoryReadParams) => await readFileImpl(params),
);

const { memoryIndexModuleId, memoryToolsRuntimeModuleId } = vi.hoisted(() => ({
  memoryIndexModuleId: "./memory/index.js",
  memoryToolsRuntimeModuleId: "./tools.runtime.js",
}));

vi.mock(memoryIndexModuleId, () => ({
  getMemorySearchManager: getMemorySearchManagerMock,
}));

vi.mock(memoryToolsRuntimeModuleId, () => ({
  resolveMemoryBackendConfig: ({
    cfg,
  }: {
    cfg?: { memory?: { backend?: string; qmd?: unknown } };
  }) => ({
    backend,
    qmd: cfg?.memory?.qmd,
  }),
  getMemorySearchManager: getMemorySearchManagerMock,
  readAgentMemoryFile: readAgentMemoryFileMock,
}));

export function setMemoryBackend(next: MemoryBackend): void {
  backend = next;
}

export function setMemorySearchImpl(next: SearchImpl): void {
  searchImpl = next;
}

export function setMemoryWorkspaceDir(next: string): void {
  workspaceDir = next;
}

export function setMemoryReadFileImpl(
  next: (params: MemoryReadParams) => Promise<MemoryReadResult>,
): void {
  readFileImpl = next;
}

export function resetMemoryToolMockState(overrides?: {
  backend?: MemoryBackend;
  searchImpl?: SearchImpl;
  readFileImpl?: (params: MemoryReadParams) => Promise<MemoryReadResult>;
}): void {
  backend = overrides?.backend ?? "builtin";
  workspaceDir = "/workspace";
  searchImpl = overrides?.searchImpl ?? (async () => []);
  readFileImpl =
    overrides?.readFileImpl ??
    (async (params: MemoryReadParams) => ({ text: "", path: params.relPath }));
  vi.clearAllMocks();
}

export function getMemorySearchManagerMockCalls(): number {
  return getMemorySearchManagerMock.mock.calls.length;
}

export function getMemorySearchManagerMockConfigs(): unknown[] {
  return getMemorySearchManagerMock.mock.calls.map(([params]) => params.cfg);
}

export function getReadAgentMemoryFileMockCalls(): number {
  return readAgentMemoryFileMock.mock.calls.length;
}
