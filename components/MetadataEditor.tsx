"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ADMIN_EMAIL, MAGIC_COLOURS } from "@/lib/constants"
import { Edit2 } from "lucide-react"

interface MetadataEditorProps {
  entityType: "player" | "deck" | "game"
  entityId: number
  currentMetadata: Record<string, any> | null
  onUpdate: () => void
}

export function MetadataEditor({ entityType, entityId, currentMetadata, onUpdate }: MetadataEditorProps) {
  const { data: session } = useSession()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metadata, setMetadata] = useState<Record<string, any>>(currentMetadata || {})

  const isAdmin = session?.user?.email === ADMIN_EMAIL

  useEffect(() => {
    setMetadata(currentMetadata || {})
  }, [currentMetadata])

  if (!isAdmin) {
    return null
  }

  const handleSave = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/${entityType}s/${entityId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ metadata }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to update metadata")
      }

      setOpen(false)
      onUpdate()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update metadata")
    } finally {
      setLoading(false)
    }
  }

  const updateField = (key: string, value: any) => {
    setMetadata((prev) => {
      const next = { ...prev }
      if (value === null || value === "" || (typeof value === "string" && value.trim() === "")) {
        delete next[key]
      } else {
        next[key] = value
      }
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit2 className="h-4 w-4 mr-2" />
          Edit Metadata
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Metadata</DialogTitle>
          <DialogDescription>
            Update supplemental metadata for this {entityType}. This data is separate from the authoritative Google Drive source.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {entityType === "deck" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="colours">Colours</Label>
                <Select
                  value={metadata.colours || ""}
                  onValueChange={(value) => updateField("colours", value)}
                >
                  <SelectTrigger id="colours">
                    <SelectValue placeholder="Select colours" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {MAGIC_COLOURS.map((colour) => (
                      <SelectItem key={colour} value={colour}>
                        {colour}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="decklistUrl">Decklist URL</Label>
                <Input
                  id="decklistUrl"
                  type="url"
                  value={metadata.decklistUrl || ""}
                  onChange={(e) => updateField("decklistUrl", e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </>
          )}
          {entityType === "player" && (
            <div className="text-sm text-slate-600">
              No specific metadata fields defined for players yet.
            </div>
          )}
          {entityType === "game" && (
            <div className="text-sm text-slate-600">
              No specific metadata fields defined for games yet.
            </div>
          )}
        </div>
        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            {error}
          </div>
        )}
        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Saving..." : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

