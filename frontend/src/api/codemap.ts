import { api } from "./client";
import type { CodeMapEntry, CodeMapGroup } from "../types";

export const codeMapApi = {
  listGroups: () => api.get<CodeMapGroup[]>("/api/code-maps/groups"),
  listByGroup: (groupId: string) => api.get<CodeMapEntry[]>(`/api/code-maps/groups/${groupId}`),
  saveGroup: (groupId: string, entries: CodeMapEntry[]) =>
    api.put<CodeMapEntry[]>(`/api/code-maps/groups/${groupId}`, entries),
  deleteGroup: (groupId: string) => api.del<void>(`/api/code-maps/groups/${groupId}`),
};
