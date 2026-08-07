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
} from "@mantine/core";
import { useDisclosure, useLocalStorage } from "@mantine/hooks";
import {
  IconSun,
  IconMoon,
  IconRocket,
  IconTags,
  IconBadge,
  IconSettings,
  IconChevronLeft,
  IconChevronRight,
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
import { PrivacyProvider } from "@skillgrid/shared/context/PrivacyContext";
import { SkillGridLogo } from "@skillgrid/shared/components/shared/SkillGridLogo";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";

const theme = createTheme({
  primaryColor: "indigo",
});

const APP_VERSION = `v${__APP_VERSION__}`;

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

const App: FC = () => {
  const [opened, { toggle }] = useDisclosure();
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
    }))
  );

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

  if (loading) {
    return (
      <MantineProvider theme={theme} defaultColorScheme="auto">
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
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <ModalsProvider>
        <Notifications position="top-right" />
        <PrivacyProvider>
          <AppShell
            header={{ height: 56 }}
            navbar={{
              width: collapsed ? 72 : 260,
              breakpoint: "sm",
              collapsed: { mobile: !opened },
            }}
            padding="md"
          >
            <AppShell.Header>
              <Group h="100%" px="md" justify="space-between">
                <Group gap="sm">
                  <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
                  <SkillGridLogo size={32} />
                  <div>
                    <Group gap="xs">
                      <Title order={4} c="indigo">
                        SkillGrid Manage
                      </Title>
                      <Badge variant="light" color="indigo" size="sm">
                        Katalog-Verwaltung
                      </Badge>
                      {installedCatalogMeta?.version && (
                        <Badge variant="outline" color="gray" size="sm">
                          freigegeben v{installedCatalogMeta.version}
                        </Badge>
                      )}
                      {hasUnpublishedCatalogChanges && (
                        <Badge variant="filled" color="orange" size="sm">
                          ungesicherte Änderungen
                        </Badge>
                      )}
                    </Group>
                    {projectTitle && (
                      <Text size="xs" c="dimmed">
                        {projectTitle}
                      </Text>
                    )}
                  </div>
                </Group>
                <Group gap="xs">
                  <Text size="xs" c="dimmed">
                    {APP_VERSION}
                  </Text>
                  <ColorSchemeToggle />
                </Group>
              </Group>
            </AppShell.Header>

            <AppShell.Navbar p="md">
              <Stack gap="xs" style={{ flex: 1 }}>
                {NAV_ITEMS.map((item) => (
                  <NavLink
                    key={item.value}
                    label={collapsed ? undefined : item.label}
                    leftSection={<item.icon size={18} />}
                    active={activeTab === item.value}
                    onClick={() => {
                      setActiveTab(item.value);
                      if (opened) toggle();
                    }}
                  />
                ))}
              </Stack>
              {!collapsed && (
                <Text size="xs" c="dimmed" px="xs" mb="sm">
                  Zentrale Pflege von Skills & Rollen. Nach Änderungen eine{" "}
                  <strong>Version freigeben</strong> und die Datei in Team
                  importieren.
                </Text>
              )}
              <ActionIcon
                variant="subtle"
                onClick={() => setCollapsed((c) => !c)}
                visibleFrom="sm"
              >
                {collapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
              </ActionIcon>
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
                  <SystemDangerZone catalogOnly />
                </Box>
              )}
            </AppShell.Main>
          </AppShell>
        </PrivacyProvider>
      </ModalsProvider>
    </MantineProvider>
  );
};

export default App;
