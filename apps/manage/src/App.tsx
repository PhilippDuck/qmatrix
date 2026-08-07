/**
 * SkillGrid Manage — zentrale Katalog-Verwaltung (Skills, Rollen, Versionen).
 */
import { useState, useEffect, type FC } from "react";
import {
  AppShell,
  Group,
  Title,
  MantineProvider,
  Loader,
  Center,
  Stack,
  NavLink,
  createTheme,
  Burger,
  ActionIcon,
  Tooltip,
  Text,
  Badge,
  TextInput,
  useMantineColorScheme,
  useComputedColorScheme,
  Box,
  type MantineColorScheme,
} from "@mantine/core";
import { useDisclosure, useLocalStorage, useHotkeys } from "@mantine/hooks";
import {
  IconSun,
  IconMoon,
  IconRocket,
  IconTags,
  IconBadge,
  IconSettings,
  IconChevronLeft,
  IconChevronRight,
  IconHistory,
  IconDeviceFloppy,
  IconEdit,
  type Icon,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import { useStore, useShallow } from "@skillgrid/shared/store/hooks";
import { CategoryManager } from "@skillgrid/shared/components/CategoryManager";
import { RoleManager } from "@skillgrid/shared/components/organization/RoleManager";
import { CatalogReleasePanel } from "@skillgrid/shared/components/CatalogReleasePanel";
import { SystemDangerZone } from "@skillgrid/shared/components/SystemDangerZone";
import { ManageGlobalBackup } from "@skillgrid/shared/components/ManageGlobalBackup";
import { ManageDemoGenerator } from "@skillgrid/shared/components/ManageDemoGenerator";
import { ManageEmptyOnboarding } from "@skillgrid/shared/components/ManageEmptyOnboarding";
import { HistoryDrawer } from "@skillgrid/shared/components/shared/HistoryDrawer";
import { UnpublishedCatalogBadge } from "@skillgrid/shared/components/UnpublishedCatalogBadge";
import { PrivacyProvider } from "@skillgrid/shared/context/PrivacyContext";
import { SkillGridLogo } from "@skillgrid/shared/components/shared/SkillGridLogo";
import { AppVersionBadge } from "@skillgrid/shared/components/shared/AppVersionBadge";
/** Always in sync with apps/manage/package.json (not Katalog-Release, not Full). */
import managePackage from "../package.json";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";

/** Same palette as Full / Team (blue primary + dark surface scale). */
const theme = createTheme({
  primaryColor: "blue",
  colors: {
    dark: [
      "#C1C2C5", // 0 - Text
      "#A6A7AB", // 1
      "#909296", // 2
      "#5c5f66", // 3
      "#373A40", // 4
      "#2C2E33", // 5
      "#25262b", // 6
      "#1A1B1E", // 7 - Surfaces
      "#141517", // 8 - Background
      "#101113", // 9 - Deep Background
    ],
  },
  // Mantine default system stack (= Full): no custom fontFamily
});

/** Source of truth: apps/manage/package.json → shown as "APP x.x.x". */
const APP_VERSION = managePackage.version;

type ManageTab = "skills" | "roles" | "releases" | "system";

const NAV_ITEMS: { value: ManageTab; label: string; icon: Icon }[] = [
  { value: "skills", label: "Skills & Kategorien", icon: IconTags },
  { value: "roles", label: "Rollen", icon: IconBadge },
  { value: "releases", label: "Versionen & Releases", icon: IconRocket },
  { value: "system", label: "System", icon: IconSettings },
];

function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light");
  return (
    <Tooltip label={computedColorScheme === "dark" ? "Light Mode" : "Dark Mode"}>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="md"
        onClick={() =>
          setColorScheme(computedColorScheme === "dark" ? "light" : "dark")
        }
      >
        {computedColorScheme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
      </ActionIcon>
    </Tooltip>
  );
}

/** Like Full SaveButton: one-click disaster-recovery JSON download. */
function QuickBackupButton({
  needsAttention,
  lastUpdate,
  onSave,
}: {
  needsAttention: boolean;
  lastUpdate: number | null;
  onSave: () => void | Promise<unknown>;
}) {
  const [wiggleAngle, setWiggleAngle] = useState(0);
  const [saving, setSaving] = useState(false);

  const lastUpdateStr = lastUpdate
    ? new Date(lastUpdate).toLocaleTimeString("de-DE", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  const tooltipLabel = lastUpdateStr
    ? `Schnellbackup (Letzte Änderung: ${lastUpdateStr})`
    : "Schnellbackup — gesamter Manage-Stand (Katalog + Versionsarchiv)";

  useEffect(() => {
    let outerInterval: ReturnType<typeof setInterval> | undefined;
    let wiggleSequence: ReturnType<typeof setInterval> | undefined;
    if (needsAttention) {
      const angles = [-15, 15, -10, 10, -5, 5, 0];
      const playWiggle = () => {
        let index = 0;
        setWiggleAngle(angles[index]);
        index++;
        wiggleSequence = setInterval(() => {
          if (index < angles.length) {
            setWiggleAngle(angles[index]);
            index++;
          } else {
            clearInterval(wiggleSequence);
          }
        }, 120);
      };
      playWiggle();
      outerInterval = setInterval(playWiggle, 10000);
    } else {
      setWiggleAngle(0);
    }
    return () => {
      if (outerInterval) clearInterval(outerInterval);
      if (wiggleSequence) clearInterval(wiggleSequence);
    };
  }, [needsAttention]);

  return (
    <Tooltip label={tooltipLabel}>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="md"
        loading={saving}
        onClick={() => {
          setSaving(true);
          void Promise.resolve(onSave()).finally(() => setSaving(false));
        }}
        style={{ position: "relative" }}
      >
        <div
          style={{
            transform: `rotate(${wiggleAngle}deg)`,
            transition: "transform 0.15s ease-in-out",
          }}
        >
          <IconDeviceFloppy size={18} />
        </div>
        {needsAttention && (
          <div
            style={{
              position: "absolute",
              top: 4,
              right: 4,
              width: 8,
              height: 8,
              backgroundColor: "var(--mantine-color-red-6)",
              borderRadius: "50%",
            }}
          />
        )}
      </ActionIcon>
    </Tooltip>
  );
}

const App: FC = () => {
  const [opened, { toggle }] = useDisclosure();
  const [historyOpened, { open: openHistory, close: closeHistory }] =
    useDisclosure(false);
  const [collapsed, setCollapsed] = useLocalStorage({
    key: "skillgrid-manage-nav-collapsed",
    defaultValue: false,
  });
  const [activeTab, setActiveTab] = useLocalStorage<ManageTab>({
    key: "skillgrid-manage-tab",
    defaultValue: "skills",
  });

  const [isEditingCatalogName, setIsEditingCatalogName] = useState(false);
  const [tempCatalogName, setTempCatalogName] = useState("");
  /** User dismissed empty welcome (can still use nav while catalog is empty). */
  const [skipEmptyOnboarding, setSkipEmptyOnboarding] = useState(false);

  const {
    loading,
    error,
    initDb,
    projectTitle,
    updateProjectTitle,
    installedCatalogMeta,
    hasUnpublishedCatalogChanges,
    categories,
    subcategories,
    skills,
    roles,
    refreshCatalogDirtyState,
    changeHistory,
    undoChange,
    hasUnsavedChanges,
    exportManageBackup,
  } = useStore(
    useShallow((s) => ({
      loading: s.loading,
      error: s.error,
      initDb: s.initDb,
      projectTitle: s.projectTitle,
      updateProjectTitle: s.updateProjectTitle,
      installedCatalogMeta: s.installedCatalogMeta,
      hasUnpublishedCatalogChanges: s.hasUnpublishedCatalogChanges,
      categories: s.categories,
      subcategories: s.subcategories,
      skills: s.skills,
      roles: s.roles,
      refreshCatalogDirtyState: s.refreshCatalogDirtyState,
      changeHistory: s.changeHistory,
      undoChange: s.undoChange,
      hasUnsavedChanges: s.hasUnsavedChanges,
      exportManageBackup: s.exportManageBackup,
    }))
  );

  const lastUpdate =
    changeHistory.length > 0 ? changeHistory[0].timestamp : null;
  const needsBackupAttention =
    hasUnsavedChanges || hasUnpublishedCatalogChanges;

  const handleQuickBackup = async () => {
    try {
      await exportManageBackup();
      notifications.show({
        title: "Schnellbackup erstellt",
        message:
          "Gesamter Manage-Stand heruntergeladen (Katalog + Versionsarchiv).",
        color: "green",
      });
    } catch (e) {
      notifications.show({
        title: "Backup fehlgeschlagen",
        message: e instanceof Error ? e.message : String(e),
        color: "red",
      });
    }
  };

  useEffect(() => {
    initDb();
  }, [initDb]);

  // Once: seed catalog name from last release meta if project title empty
  useEffect(() => {
    if (loading) return;
    if (!projectTitle?.trim() && installedCatalogMeta?.name?.trim()) {
      void updateProjectTitle(installedCatalogMeta.name.trim());
    }
  }, [loading, projectTitle, installedCatalogMeta?.name, updateProjectTitle]);

  const isCatalogEmpty =
    categories.length === 0 && skills.length === 0 && roles.length === 0;

  // After data exists, allow onboarding again if catalog is later wiped
  useEffect(() => {
    if (!isCatalogEmpty) {
      setSkipEmptyOnboarding(false);
    }
  }, [isCatalogEmpty]);

  // Keep header "ungesicherte Änderungen" badge in sync while editing skills/roles
  useEffect(() => {
    if (!loading) {
      void refreshCatalogDirtyState();
    }
  }, [loading, categories, subcategories, skills, roles, refreshCatalogDirtyState]);

  const handleCatalogNameSave = () => {
    const next = tempCatalogName.trim();
    void updateProjectTitle(next);
    setIsEditingCatalogName(false);
  };

  useEffect(() => {
    if (error) {
      notifications.show({ title: "Fehler", message: error, color: "red" });
    }
  }, [error]);

  // Same as Full: last local actions (not catalog SemVer releases)
  useHotkeys([
    [
      "mod+z",
      () => {
        const lastUndoable = changeHistory.find((h) => !h.undone);
        if (lastUndoable?.id) {
          void undoChange(lastUndoable.id)
            .then(() => {
              notifications.show({
                title: "Rückgängig",
                message: `"${lastUndoable.entityLabel}" wurde rückgängig gemacht`,
                color: "blue",
                autoClose: 3000,
              });
            })
            .catch((err: unknown) => {
              notifications.show({
                title: "Fehler",
                message:
                  err instanceof Error
                    ? err.message
                    : "Konnte nicht rückgängig gemacht werden",
                color: "red",
              });
            });
        }
      },
    ],
  ]);

  const [colorScheme] = useLocalStorage<MantineColorScheme>({
    key: "skillgrid-color-scheme",
    defaultValue: "light",
  });

  if (loading) {
    return (
      <MantineProvider theme={theme} defaultColorScheme={colorScheme}>
        <Center h="100vh">
          <Stack align="center" gap="sm">
            <SkillGridLogo size={48} />
            <Loader size="lg" />
            <Text c="dimmed" size="sm">
              SkillGrid Manage wird geladen…
            </Text>
          </Stack>
        </Center>
      </MantineProvider>
    );
  }

  return (
    <MantineProvider theme={theme} defaultColorScheme={colorScheme}>
      <ModalsProvider>
        <Notifications position="top-right" />
        <PrivacyProvider>
          <AppShell
            header={{ height: 60 }}
            navbar={{
              width: collapsed ? 70 : 240,
              breakpoint: "sm",
              collapsed: { mobile: !opened },
            }}
            padding="md"
            transitionDuration={0}
            styles={{ root: { height: "100dvh" } }}
          >
            <AppShell.Header>
              {/* Inner relative wrapper — do NOT set position on Header itself
                  (would override AppShell fixed and double the main top offset). */}
              <Box
                h="100%"
                px="md"
                style={{ position: "relative" }}
              >
                <Group h="100%" justify="space-between" wrap="nowrap">
                  <Group gap="sm" wrap="nowrap" style={{ minWidth: 0, flex: 1 }}>
                    <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                    <ActionIcon
                      variant="subtle"
                      onClick={() => setCollapsed((c) => !c)}
                      visibleFrom="sm"
                      color="gray"
                      size="md"
                      style={{ flexShrink: 0 }}
                    >
                      {collapsed ? (
                        <IconChevronRight size={18} />
                      ) : (
                        <IconChevronLeft size={18} />
                      )}
                    </ActionIcon>
                    <SkillGridLogo size={collapsed ? 28 : 32} />
                    <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                      <Title
                        order={4}
                        c="blue"
                        style={{
                          letterSpacing: -0.5,
                          fontSize: "1.1rem",
                          transition: "all 0.2s ease",
                          userSelect: "none",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                          marginRight: 6,
                        }}
                      >
                        {collapsed ? "MANAGE" : "SKILLGRID Manage"}
                      </Title>
                      {installedCatalogMeta?.version ? (
                        <Tooltip label="Freigegebene Katalog-Version (Live)">
                          <Badge
                            variant="outline"
                            color="gray"
                            size="sm"
                            style={{ flexShrink: 0 }}
                          >
                            Katalog v{installedCatalogMeta.version}
                          </Badge>
                        </Tooltip>
                      ) : (
                        <Badge
                          variant="outline"
                          color="gray"
                          size="sm"
                          style={{ flexShrink: 0 }}
                        >
                          Katalog —
                        </Badge>
                      )}
                      <UnpublishedCatalogBadge
                        size="sm"
                        label="ungesichert"
                        onPublish={() => setActiveTab("releases")}
                      />
                    </Group>
                  </Group>

                  {/* Catalog name — centered in header (organigram / releases SoT) */}
                  <Box
                    visibleFrom="sm"
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      maxWidth: "min(360px, 40vw)",
                      zIndex: 1,
                    }}
                  >
                    {isEditingCatalogName ? (
                      <TextInput
                        value={tempCatalogName}
                        onChange={(e) =>
                          setTempCatalogName(e.currentTarget.value)
                        }
                        onBlur={handleCatalogNameSave}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            e.currentTarget.blur();
                          }
                          if (e.key === "Escape")
                            setIsEditingCatalogName(false);
                        }}
                        size="sm"
                        autoFocus
                        placeholder="Katalogname"
                        styles={{
                          input: {
                            textAlign: "center",
                            fontWeight: 700,
                            fontSize: "var(--mantine-font-size-md)",
                          },
                        }}
                      />
                    ) : (
                      <Tooltip label="Katalogname bearbeiten (Organigramm, Releases)">
                        <Group
                          gap={6}
                          justify="center"
                          wrap="nowrap"
                          onClick={() => {
                            setTempCatalogName(projectTitle || "");
                            setIsEditingCatalogName(true);
                          }}
                          style={{ cursor: "pointer", userSelect: "none" }}
                        >
                          <Text
                            fw={700}
                            size="md"
                            lineClamp={1}
                            c={projectTitle ? undefined : "dimmed"}
                          >
                            {projectTitle || "Katalogname eingeben"}
                          </Text>
                          <IconEdit
                            size={16}
                            color="var(--mantine-color-gray-5)"
                            style={{ opacity: 0.5, flexShrink: 0 }}
                          />
                        </Group>
                      </Tooltip>
                    )}
                  </Box>

                  <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
                    <QuickBackupButton
                      needsAttention={needsBackupAttention}
                      lastUpdate={lastUpdate}
                      onSave={handleQuickBackup}
                    />
                    <Tooltip label="Änderungshistorie (lokale Aktionen, unabhängig von Katalog-Versionen)">
                      <ActionIcon
                        variant="subtle"
                        color="gray"
                        size="md"
                        onClick={openHistory}
                      >
                        <IconHistory size={18} />
                      </ActionIcon>
                    </Tooltip>
                    <ColorSchemeToggle />
                  </Group>
                </Group>
              </Box>
            </AppShell.Header>

            <AppShell.Navbar p="xs" style={{ display: "flex", flexDirection: "column" }}>
              <Stack gap={4} style={{ flex: 1 }}>
                {NAV_ITEMS.map((item) => (
                  <Tooltip
                    key={item.value}
                    label={item.label}
                    position="right"
                    disabled={!collapsed}
                    withArrow
                    offset={15}
                  >
                    <NavLink
                      label={
                        !collapsed ? (
                          <Text size="sm" fw={500}>
                            {item.label}
                          </Text>
                        ) : null
                      }
                      leftSection={
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <item.icon size={18} stroke={1.5} />
                        </div>
                      }
                      active={activeTab === item.value}
                      onClick={() => {
                        setActiveTab(item.value);
                        if (opened) toggle();
                      }}
                      variant="light"
                      color="blue"
                      style={{
                        borderRadius: 6,
                        height: 40,
                      }}
                    />
                  </Tooltip>
                ))}
              </Stack>
              {/* App version footer (package version, not Katalog) */}
              <Box
                py="sm"
                px="xs"
                style={{
                  borderTop: "1px solid var(--mantine-color-default-border)",
                  marginTop: "auto",
                }}
              >
                <AppVersionBadge version={APP_VERSION} expanded={!collapsed} />
              </Box>
            </AppShell.Navbar>

            <AppShell.Main>
              {!loading && isCatalogEmpty && !skipEmptyOnboarding ? (
                <ManageEmptyOnboarding
                  onStartSkills={() => {
                    setSkipEmptyOnboarding(true);
                    setActiveTab("skills");
                  }}
                  onStartImport={() => {
                    setSkipEmptyOnboarding(true);
                    setActiveTab("releases");
                  }}
                />
              ) : (
                <>
                  {activeTab === "skills" && <CategoryManager />}
                  {activeTab === "roles" && <RoleManager />}
                  {activeTab === "releases" && <CatalogReleasePanel />}
                  {activeTab === "system" && (
                    <Box style={{ width: "100%" }}>
                      <Title order={2} mb="lg">
                        System
                      </Title>
                      <Stack gap="lg">
                        <ManageGlobalBackup />
                        <ManageDemoGenerator />
                        <SystemDangerZone catalogOnly />
                      </Stack>
                    </Box>
                  )}
                </>
              )}
            </AppShell.Main>
            <HistoryDrawer opened={historyOpened} onClose={closeHistory} />
          </AppShell>
        </PrivacyProvider>
      </ModalsProvider>
    </MantineProvider>
  );
};

export default App;
