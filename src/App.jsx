import { useState, useEffect } from "react";
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
  Box,
  useMantineColorScheme,
  useComputedColorScheme,
  TextInput,
} from "@mantine/core";
import { useDisclosure, useLocalStorage } from "@mantine/hooks";
import {
  IconUsers,
  IconTags,
  IconLayoutGrid,
  IconDatabase,
  IconBuildingSkyscraper,
  IconChevronLeft,
  IconChevronRight,
  IconSun,
  IconMoon,
  IconSettings,
  IconDashboard,
  IconHeart,
  IconEye,
  IconEyeOff,
  IconDeviceFloppy,
  IconEdit,
  IconCertificate,
} from "@tabler/icons-react";

import { DataProvider, useData } from "./context/DataContext";
import { UnifiedDataView } from "./components/UnifiedDataView";
import { SkillMatrix } from "./components/SkillMatrix";
import { DataManagement } from "./components/DataManagement";
import { Dashboard } from "./components/Dashboard/Dashboard";
import { QualificationPlan } from "./components/QualificationPlan";
import { WelcomeModal } from "./components/WelcomeModal";
import { ChangelogModal } from "./components/ChangelogModal";
import { PrivacyProvider, usePrivacy } from "./context/PrivacyContext";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";

const theme = createTheme({
  primaryColor: "blue",
});

import packageJson from "../package.json";
const APP_VERSION = `v${packageJson.version}`;

function ColorSchemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light");

  return (
    <Tooltip label={computedColorScheme === "dark" ? "Light Mode" : "Dark Mode"}>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="md"
        onClick={() => setColorScheme(computedColorScheme === "dark" ? "light" : "dark")}
      >
        {computedColorScheme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
      </ActionIcon>
    </Tooltip>
  );
}

function AnonymousToggle() {
  const { anonymousMode, setAnonymousMode } = usePrivacy();

  return (
    <Tooltip label={anonymousMode ? "Anonymisierung deaktivieren" : "Anonymisierung aktivieren (Namen ausblenden)"}>
      <ActionIcon
        variant={anonymousMode ? "filled" : "subtle"}
        color={anonymousMode ? "blue" : "gray"}
        size="md"
        onClick={() => setAnonymousMode(!anonymousMode)}
      >
        {anonymousMode ? <IconEyeOff size={18} /> : <IconEye size={18} />}
      </ActionIcon>
    </Tooltip>
  );
}

function AppContent() {
  const { loading, exportData, projectTitle, updateProjectTitle } = useData();
  const computedColorScheme = useComputedColorScheme("light");
  const [activeTab, setActiveTab] = useLocalStorage({
    key: 'skillgrid-active-tab',
    defaultValue: 'matrix',
  });

  // Navigation params for cross-module jumping (e.g. Matrix -> QualPlan)
  const [navParams, setNavParams] = useState(null);

  const handleNavigate = (tab, params) => {
    setNavParams(params);
    setActiveTab(tab);
  };

  // Title edit state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("");

  // Changelog modal state
  const [changelogOpened, { open: openChangelog, close: closeChangelog }] = useDisclosure(false);

  const handleTitleSave = () => {
    if (tempTitle !== projectTitle) {
      updateProjectTitle(tempTitle);
    }
    setIsEditingTitle(false);
  };

  // Sidebar State (Desktop)
  const [desktopOpened, setDesktopOpened] = useState(true);
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure(false);

  // Zustand aus IndexedDB laden (Initialisierung)
  useEffect(() => {
    const loadSidebarState = async () => {
      try {
        const saved = localStorage.getItem("skillgrid-sidebar-opened") || localStorage.getItem("sidebar-opened");
        if (saved !== null) {
          setDesktopOpened(JSON.parse(saved));
        }
      } catch (e) {
        console.error("Fehler beim Laden des Sidebar-Status", e);
      }
    };
    loadSidebarState();
  }, []);

  // Zustand speichern (Migration enthalten)
  useEffect(() => {
    localStorage.setItem("skillgrid-sidebar-opened", JSON.stringify(desktopOpened));
  }, [desktopOpened]);

  const toggleDesktop = () => setDesktopOpened((o) => !o);

  if (loading) {
    return (
      <Center style={{ height: "100vh", width: "100vw" }}>
        <Stack align="center">
          <Loader size="xl" />
          <Title order={4}>Datenbank wird geladen...</Title>
        </Stack>
      </Center>
    );
  }

  const navItems = [
    { value: "dashboard", label: "Dashboard", icon: IconDashboard },
    { value: "matrix", label: "Skill-Matrix", icon: IconLayoutGrid },
    { value: "qualification", label: "Qualifizierung", icon: IconCertificate },
    { value: "data", label: "Stammdaten", icon: IconDatabase },
    { value: "system", label: "System", icon: IconSettings },
  ];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: desktopOpened ? 240 : 70,
        breakpoint: "sm",
        collapsed: { mobile: !mobileOpened },
      }}
      padding="md"
      transitionDuration={300}
      transitionTimingFunction="ease"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger
              opened={mobileOpened}
              onClick={toggleMobile}
              hiddenFrom="sm"
              size="sm"
              color={computedColorScheme === "dark" ? "white" : undefined}
            />

            <ActionIcon
              variant="subtle"
              onClick={toggleDesktop}
              visibleFrom="sm"
              color="gray"
              size="md"
            >
              {desktopOpened ? (
                <IconChevronLeft size={18} />
              ) : (
                <IconChevronRight size={18} />
              )}
            </ActionIcon>

            <Group gap="xs">
              <Title
                order={4}
                c="blue"
                style={{
                  letterSpacing: -0.5,
                  fontSize: desktopOpened ? "1.1rem" : "0.9rem",
                  transition: "all 0.2s ease",
                  userSelect: "none",
                }}
              >
                {desktopOpened ? "SkillGrid" : "SG"}
              </Title>

              {/* Versions-Badge */}
              {desktopOpened && (
                <Tooltip label="Changelog anzeigen">
                  <Badge
                    variant="subtle"
                    color="gray"
                    size="xs"
                    onClick={openChangelog}
                    style={{ cursor: "pointer" }}
                    styles={{ root: { textTransform: "none", opacity: 0.7 } }}
                  >
                    {APP_VERSION}
                  </Badge>
                </Tooltip>
              )}
            </Group>
          </Group>

          {/* Center Project Title */}
          <Box style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)' }}>
            {isEditingTitle ? (
              <TextInput
                value={tempTitle}
                onChange={(e) => setTempTitle(e.currentTarget.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault(); // Prevent accidental form submission
                    e.currentTarget.blur(); // Trigger blur to save
                  }
                  if (e.key === 'Escape') setIsEditingTitle(false);
                }}
                size="sm"
                autoFocus
                styles={{ input: { textAlign: 'center', fontWeight: 700, fontSize: 'var(--mantine-font-size-lg)' } }}
              />
            ) : (
              <Group gap="xs" onClick={() => { setTempTitle(projectTitle); setIsEditingTitle(true); }} style={{ cursor: 'pointer', userSelect: 'none' }}>
                <Text fw={700} size="lg" c={projectTitle ? undefined : 'dimmed'}>
                  {projectTitle || "Projektname eingeben"}
                </Text>
                <IconEdit size={18} color="var(--mantine-color-gray-5)" style={{ opacity: 0.5 }} />
              </Group>
            )}
          </Box>

          <Group gap="xs">
            <Tooltip label="Schnellspeicherung (Backup Export)">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="md"
                onClick={() => exportData()}
              >
                <IconDeviceFloppy size={18} />
              </ActionIcon>
            </Tooltip>
            <AnonymousToggle />
            <ColorSchemeToggle />
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs" style={{ display: 'flex', flexDirection: 'column' }}>
        <Stack gap={4}>
          {navItems.map((item) => (
            <Tooltip
              key={item.value}
              label={item.label}
              position="right"
              disabled={desktopOpened}
              withArrow
              offset={15}
            >
              <NavLink
                label={
                  desktopOpened ? (
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
                      transition: "transform 0.2s ease",
                    }}
                    className="nav-icon-wrapper"
                  >
                    <item.icon size={18} stroke={1.5} />
                  </div>
                }
                active={activeTab === item.value}
                onClick={() => {
                  setActiveTab(item.value);
                  if (mobileOpened) toggleMobile();
                }}
                variant="light"
                color="blue"
                style={{
                  borderRadius: 6,
                  height: 40,
                  transition: "all 0.15s ease",
                }}
                styles={{
                  root: {
                    "&:hover": {
                      "& .nav-icon-wrapper": {
                        transform: "scale(1.2)",
                      },
                    },
                  },
                }}
              />
            </Tooltip>
          ))}
        </Stack>

        {/* Spacer */}
        <Box style={{ flex: 1 }} />

        {/* Credits */}
        {desktopOpened && (
          <Box
            py="sm"
            px="xs"
            style={{
              borderTop: '1px solid var(--mantine-color-default-border)',
              marginTop: 'auto',
            }}
          >
            <Text size="xs" c="dimmed" ta="center">
              Designed with{' '}
              <IconHeart
                size={12}
                style={{ verticalAlign: 'middle', color: 'var(--mantine-color-red-6)' }}
                fill="var(--mantine-color-red-6)"
              />{' '}
              by
            </Text>
            <Text size="xs" c="dimmed" ta="center" fw={500}>
              Philipp-Marcel Duck
            </Text>
          </Box>
        )}
      </AppShell.Navbar>

      <AppShell.Main
        style={{
          display: "flex",
          flexDirection: "column",
          backgroundColor: computedColorScheme === "dark" ? "var(--mantine-color-dark-8)" : "#f8f9fa",
        }}
      >
        <div
          style={{
            width: "100%",
            flex: 1,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {activeTab === "dashboard" && <Dashboard />}
          {activeTab === "matrix" && <SkillMatrix onNavigate={handleNavigate} />}
          {activeTab === "qualification" && <QualificationPlan initialEmployeeId={navParams?.employeeId} onClearParams={() => setNavParams(null)} />}
          {activeTab === "data" && <UnifiedDataView />}
          {activeTab === "system" && <DataManagement />}
        </div>
      </AppShell.Main>
      <WelcomeModal />
      <ChangelogModal opened={changelogOpened} onClose={closeChangelog} />
    </AppShell >
  );
}

function App() {
  // Migration Logic
  useEffect(() => {
    try {
      // Migrate Color Scheme
      if (!localStorage.getItem("skillgrid-color-scheme") && localStorage.getItem("qtrack-color-scheme")) {
        localStorage.setItem("skillgrid-color-scheme", localStorage.getItem("qtrack-color-scheme"));
      }
      // Migrate Anonymous Mode
      if (!localStorage.getItem("skillgrid-anonymous-mode") && localStorage.getItem("qtrack-anonymous-mode")) {
        localStorage.setItem("skillgrid-anonymous-mode", localStorage.getItem("qtrack-anonymous-mode"));
      }
      // Migrate Dashboard Tiles
      if (!localStorage.getItem("skillgrid-dashboard-tiles") && localStorage.getItem("qtrack-dashboard-tiles")) {
        localStorage.setItem("skillgrid-dashboard-tiles", localStorage.getItem("qtrack-dashboard-tiles"));
      }
    } catch (e) {
      console.error("Migration failed", e);
    }
  }, []);

  const [colorScheme, setColorScheme] = useLocalStorage({
    key: "skillgrid-color-scheme",
    defaultValue: "light",
  });

  return (
    <MantineProvider theme={theme} defaultColorScheme={colorScheme}>
      <Notifications />
      <ModalsProvider>
        <PrivacyProvider>
          <DataProvider>
            <AppContent />
          </DataProvider>
        </PrivacyProvider>
      </ModalsProvider>
    </MantineProvider>
  );
}

export default App;
