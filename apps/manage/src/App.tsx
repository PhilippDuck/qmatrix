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
import { HistoryDrawer } from "@skillgrid/shared/components/shared/HistoryDrawer";
import { UnpublishedCatalogBadge } from "@skillgrid/shared/components/UnpublishedCatalogBadge";
import { PrivacyProvider } from "@skillgrid/shared/context/PrivacyContext";
import { SkillGridLogo } from "@skillgrid/shared/components/shared/SkillGridLogo";
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

/** Source of truth: apps/manage/package.json → shown as "App vX.Y.Z". */
const APP_VERSION = `v${managePackage.version}`;
const APP_VERSION_LABEL = `App ${APP_VERSION}`;

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

  const {
    loading,
    error,
    initDb,
    projectTitle,
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

  // Keep header "ungesicherte Änderungen" badge in sync while editing skills/roles
  useEffect(() => {
    if (!loading) {
      void refreshCatalogDirtyState();
    }
  }, [loading, categories, subcategories, skills, roles, refreshCatalogDirtyState]);

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
              <Group h="100%" px="md" justify="space-between" wrap="nowrap">
                <Group gap="sm" wrap="nowrap" style={{ minWidth: 0 }}>
                  <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                  {/* Sidebar collapse — same place as Full (header, left of logo) */}
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
                  <SkillGridLogo size={28} />
                  <Group gap={6} wrap="nowrap" style={{ minWidth: 0 }}>
                    <Title
                      order={4}
                      c="blue"
                      style={{
                        letterSpacing: -0.5,
                        fontSize: "1.05rem",
                        userSelect: "none",
                        whiteSpace: "nowrap",
                        flexShrink: 0,
                        marginRight: 6,
                      }}
                    >
                      {collapsed ? "Manage" : "SkillGrid Manage"}
                    </Title>
                    {installedCatalogMeta?.version ? (
                      <Tooltip label="Freigegebene Katalog-Version (Live)">
                        <Badge variant="outline" color="gray" size="sm" style={{ flexShrink: 0 }}>
                          Katalog v{installedCatalogMeta.version}
                        </Badge>
                      </Tooltip>
                    ) : (
                      <Badge variant="outline" color="gray" size="sm" style={{ flexShrink: 0 }}>
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
                <Group gap="xs" wrap="nowrap" style={{ flexShrink: 0 }}>
                  {projectTitle && (
                    <Text size="sm" c="dimmed" visibleFrom="lg" lineClamp={1} maw={180}>
                      {projectTitle}
                    </Text>
                  )}
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
              {/* App version footer (apps/manage package version, not Katalog) */}
              <Box
                py="sm"
                px="xs"
                style={{
                  borderTop: "1px solid var(--mantine-color-default-border)",
                  marginTop: "auto",
                }}
              >
                {!collapsed ? (
                  <Badge
                    variant="subtle"
                    color="gray"
                    size="xs"
                    fullWidth
                    styles={{ root: { textTransform: "none", opacity: 0.75 } }}
                  >
                    {APP_VERSION_LABEL}
                  </Badge>
                ) : (
                  <Tooltip label={APP_VERSION_LABEL} position="right" withArrow>
                    <Badge
                      variant="subtle"
                      color="gray"
                      size="xs"
                      fullWidth
                      styles={{
                        root: {
                          textTransform: "none",
                          opacity: 0.75,
                          paddingInline: 4,
                        },
                      }}
                    >
                      {APP_VERSION.replace(/^v/, "")}
                    </Badge>
                  </Tooltip>
                )}
              </Box>
            </AppShell.Navbar>

            <AppShell.Main>
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
                    <SystemDangerZone catalogOnly />
                  </Stack>
                </Box>
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
