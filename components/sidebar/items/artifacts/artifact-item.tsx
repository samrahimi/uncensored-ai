import { FC } from "react"
import { Artifact } from "@/types"
import { SidebarDeleteItem } from "../all/sidebar-delete-item"

interface ArtifactItemProps {
  artifact: Artifact
  onDelete: () => void
}

export const ArtifactItem: FC<ArtifactItemProps> = ({ artifact, onDelete }) => {
  return (
    <div className="flex items-center justify-between">
      <div className="truncate">
        {artifact.content.name || "Unnamed Artifact"}
      </div>
      <SidebarDeleteItem
        itemName={artifact.content.name || "artifact"}
        onDelete={onDelete}
      />
    </div>
  )
}
