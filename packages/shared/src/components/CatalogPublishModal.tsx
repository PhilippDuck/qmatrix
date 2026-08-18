/**
 * Publish a new catalog SemVer release. Used from the ungesichert hover
 * (any page) and from Versionen & Releases.
 */
import React, { useMemo, useState } from "react";
import {
  Modal,
  Stack,
  Text,
  Group,
  Button,
  TextInput,
  Textarea,
  SegmentedControl,
} from "@mantine/core";
import { IconRocket } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useStore, useShallow } from "../store/hooks";
import { bumpSemVer, isValidSemVer, type SemVerBump } from "../services/catalog";
import { compilePendingCatalogNotes } from "../utils/catalogChangeNotes";
import { CatalogChangeNotesPanel } from "./CatalogChangeNotesPanel";

function stableCatalogId(): string {
  const key = "skillgrid-manage-catalog-id";
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(key, id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}

export interface CatalogPublishModalProps {
  opened: boolean;
  onClose: () => void;
}

export const CatalogPublishModal: React.FC<CatalogPublishModalProps> = ({
  opened,
  onClose,
}) => {
  const {
    projectTitle,
    installedCatalogMeta,
    publishCatalogRelease,
    pendingCatalogNotes,
  } = useStore(
    useShallow((s) => ({
      projectTitle: s.projectTitle,
      installedCatalogMeta: s.installedCatalogMeta,
      publishCatalogRelease: s.publishCatalogRelease,
      pendingCatalogNotes: s.pendingCatalogNotes,
    }))
  );

  const [busy, setBusy] = useState(false);
  const [bump, setBump] = useState<SemVerBump>("minor");
  const [manualVersion, setManualVersion] = useState("");
  const [notes, setNotes] = useState("");
  const [useManual, setUseManual] = useState(false);

  const catalogId = useMemo(() => stableCatalogId(), []);
  const catalogName =
    projectTitle?.trim() ||
    installedCatalogMeta?.name?.trim() ||
    "Unternehmens-Katalog";
  const nextPreview = useMemo(() => {
    if (useManual && manualVersion.trim()) return manualVersion.trim();
    return bumpSemVer(installedCatalogMeta?.version || "0.0.0", bump);
  }, [bump, useManual, manualVersion, installedCatalogMeta?.version]);

  const compiledNotes = useMemo(
    () => compilePendingCatalogNotes(pendingCatalogNotes || []),
    [pendingCatalogNotes]
  );

  const handleClose = () => {
    if (!busy) onClose();
  };

  const handlePublish = async () => {
    if (useManual && !isValidSemVer(manualVersion.trim())) {
      notifications.show({
        title: "Ungültige Version",
        message: "Bitte SemVer verwenden, z. B. 1.2.0",
        color: "red",
      });
      return;
    }
    if (!notes.trim() && !compiledNotes) {
      notifications.show({
        title: "Release-Notizen fehlen",
        message:
          "Kurz beschreiben, was sich geändert hat — oder an den Tags Notizen hinterlegen.",
        color: "orange",
      });
      return;
    }

    setBusy(true);
    try {
      const result = await publishCatalogRelease({
        catalogId,
        name: catalogName,
        bump: useManual ? undefined : bump,
        version: useManual ? manualVersion.trim() : undefined,
        releaseNotes:
          notes.trim() ||
          (compiledNotes ? `Release ${nextPreview}` : ""),
        publisher: "SkillGrid Manage",
        download: true,
      });

      if (!result.ok) {
        notifications.show({
          title: "Release fehlgeschlagen",
          message:
            result.errors.map((e) => e.message).join("; ") ||
            "Unbekannter Fehler",
          color: "red",
        });
        return;
      }

      notifications.show({
        title: `Version ${result.package?.meta.version} freigegeben`,
        message:
          "Snapshot gespeichert (max. 10). JSON + TXT (Änderungsbeschreibung) heruntergeladen.",
        color: "green",
      });
      setNotes("");
      onClose();
    } catch (e) {
      notifications.show({
        title: "Fehler",
        message: e instanceof Error ? e.message : String(e),
        color: "red",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title="Neue Katalog-Version freigeben"
      size="lg"
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          Snapshot als <strong>v{nextPreview}</strong> speichern (Archiv +
          Download).
        </Text>

        <Text size="sm">
          Katalog:{" "}
          <Text span fw={600}>
            {catalogName}
          </Text>
          <Text span size="xs" c="dimmed">
            {" "}
            (Name oben in der Navigation bearbeiten)
          </Text>
        </Text>

        <Stack gap={6}>
          <Text size="sm" fw={500}>
            Versionsnummer
          </Text>
          <SegmentedControl
            fullWidth
            value={useManual ? "manual" : bump}
            onChange={(v) => {
              if (v === "manual") setUseManual(true);
              else {
                setUseManual(false);
                setBump(v as SemVerBump);
              }
            }}
            data={[
              {
                value: "patch",
                label: `Patch → ${bumpSemVer(installedCatalogMeta?.version || "0.0.0", "patch")}`,
              },
              {
                value: "minor",
                label: `Minor → ${bumpSemVer(installedCatalogMeta?.version || "0.0.0", "minor")}`,
              },
              {
                value: "major",
                label: `Major → ${bumpSemVer(installedCatalogMeta?.version || "0.0.0", "major")}`,
              },
              { value: "manual", label: "Manuell" },
            ]}
          />
          {useManual && (
            <TextInput
              label="SemVer"
              placeholder="1.4.0"
              value={manualVersion}
              onChange={(e) => setManualVersion(e.currentTarget.value)}
            />
          )}
        </Stack>

        {compiledNotes ? (
          <Stack gap={4}>
            <Text size="sm" fw={500}>
              Notizen an einzelnen Änderungen
            </Text>
            <CatalogChangeNotesPanel compact />
          </Stack>
        ) : null}

        <Textarea
          label="Übergreifender Änderungsgrund"
          description="Optionaler Überblick — die Einzelnotizen oben werden nicht nochmal hierher kopiert"
          minRows={3}
          value={notes}
          onChange={(e) => setNotes(e.currentTarget.value)}
          required={!compiledNotes}
          placeholder="z. B. Q3-Katalog: neue Backend-Skills"
        />

        <Group justify="flex-end">
          <Button variant="default" onClick={handleClose}>
            Abbrechen
          </Button>
          <Button
            color="blue"
            leftSection={<IconRocket size={16} />}
            loading={busy}
            onClick={() => void handlePublish()}
          >
            v{nextPreview} freigeben
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};
