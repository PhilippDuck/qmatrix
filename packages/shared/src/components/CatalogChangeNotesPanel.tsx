/**
 * Central editor for pending per-entity release notes (Manage).
 */
import React, { useState } from "react";
import {
  ActionIcon,
  Button,
  Card,
  Group,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { IconNotes, IconTrash, IconCheck, IconX } from "@tabler/icons-react";
import { useStore, useShallow } from "../store/hooks";
import { useCatalogVersioning } from "../hooks/useCatalogAuthoring";

const KIND_DE: Record<string, string> = {
  categories: "Kategorie",
  subcategories: "Bereich",
  skills: "Skill",
  roles: "Rolle",
};

export const CatalogChangeNotesPanel: React.FC<{
  title?: string;
  compact?: boolean;
}> = ({ title = "Änderungsnotizen", compact = false }) => {
  const versioning = useCatalogVersioning();
  const {
    pendingCatalogNotes,
    updateCatalogChangeNote,
    deleteCatalogChangeNote,
    clearPendingCatalogNotes,
  } = useStore(
    useShallow((s) => ({
      pendingCatalogNotes: s.pendingCatalogNotes,
      updateCatalogChangeNote: s.updateCatalogChangeNote,
      deleteCatalogChangeNote: s.deleteCatalogChangeNote,
      clearPendingCatalogNotes: s.clearPendingCatalogNotes,
    }))
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  if (!versioning) return null;
  const notes = [...(pendingCatalogNotes || [])].sort(
    (a, b) => a.createdAt - b.createdAt
  );
  if (notes.length === 0) return null;

  const startEdit = (id: string, text: string) => {
    setEditingId(id);
    setDraft(text);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    await updateCatalogChangeNote(editingId, draft);
    setEditingId(null);
    setDraft("");
  };

  const body = (
    <Stack gap="xs">
      {!compact && (
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="xs">
              <IconNotes size={18} />
              <Title order={4}>{title}</Title>
            </Group>
            <Text size="xs" c="dimmed">
              {notes.length} Notiz(en) — landen beim Freigeben im Releasetext.
            </Text>
          </div>
          <Button
            size="compact-xs"
            variant="subtle"
            color="red"
            onClick={() => void clearPendingCatalogNotes()}
          >
            Alle löschen
          </Button>
        </Group>
      )}
      {compact && (
        <Text size="xs" c="dimmed">
          {notes.length} Notiz(en) — klicken zum Bearbeiten
        </Text>
      )}
      {notes.map((note) => (
        <Group key={note.id} gap={6} wrap="nowrap" align="flex-start">
          {editingId === note.id ? (
            <>
              <TextInput
                size="xs"
                value={draft}
                onChange={(e) => setDraft(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void saveEdit();
                  }
                  if (e.key === "Escape") {
                    setEditingId(null);
                  }
                }}
                style={{ flex: 1 }}
                autoFocus
              />
              <ActionIcon
                size="sm"
                variant="light"
                color="teal"
                onClick={() => void saveEdit()}
                aria-label="Notiz speichern"
              >
                <IconCheck size={14} />
              </ActionIcon>
              <ActionIcon
                size="sm"
                variant="subtle"
                onClick={() => setEditingId(null)}
                aria-label="Abbrechen"
              >
                <IconX size={14} />
              </ActionIcon>
            </>
          ) : (
            <>
              <Stack
                gap={0}
                style={{ flex: 1, minWidth: 0, cursor: "text" }}
                onClick={() => startEdit(note.id, note.text)}
              >
                <Text size="xs" c="dimmed">
                  {KIND_DE[note.kind] || note.kind} · {note.entityLabel}
                </Text>
                <Text size="sm">{note.text}</Text>
              </Stack>
              <ActionIcon
                size="sm"
                variant="subtle"
                color="red"
                onClick={() => void deleteCatalogChangeNote(note.id)}
                aria-label="Notiz löschen"
              >
                <IconTrash size={14} />
              </ActionIcon>
            </>
          )}
        </Group>
      ))}
    </Stack>
  );

  if (compact) return body;
  return (
    <Card withBorder shadow="sm" radius="md">
      {body}
    </Card>
  );
};
