import type { DuplicateMatch } from "./validation";

export type UploadDocumentState = {
  error: string | null;
  duplicates: DuplicateMatch[] | null;
};

export const INITIAL_UPLOAD_STATE: UploadDocumentState = {
  error: null,
  duplicates: null,
};
