export interface Artifact {
  id: string
  content: any // Using 'any' since the content can be of various structures
  workspace_id: string
  is_public: boolean
  created_at: string
  updated_at: string
}

export type CreateArtifactParams = Omit<
  Artifact,
  "id" | "created_at" | "updated_at"
>
export type UpdateArtifactParams = Partial<
  Omit<Artifact, "id" | "created_at" | "updated_at">
>
