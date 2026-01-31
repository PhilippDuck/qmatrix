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
  useMantineColorScheme,
  useComputedColorScheme,
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
} from "@tabler/icons-react";

import { DataProvider, useData } from "./context/DataContext";
import { UnifiedDataView } from "./components/UnifiedDataView";
import { SkillMatrix } from "./components/SkillMatrix";
import { DataManagement } from "./components/DataManagement";
import { Dashboard } from "./components/Dashboard/Dashboard";
import "@mantine/core/styles.css";

const theme = createTheme({
  primaryColor: "blue",
});

// Definiere die Versionsnummer an zentraler Stelle
const APP_VERSION = "v1.1.0";

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

function AppContent() {
  const { loading } = useData();
  const computedColorScheme = useComputedColorScheme("light");
  const [activeTab, setActiveTab] = useState("dashboard");

  // Sidebar State (Desktop)
  const [desktopOpened, setDesktopOpened] = useState(true);
  const [mobileOpened, { toggle: toggleMobile }] = useDisclosure(false);

  // Zustand aus IndexedDB laden (Initialisierung)
  useEffect(() => {
    const loadSidebarState = async () => {
      try {
        const saved = localStorage.getItem("sidebar-opened");
        if (saved !== null) {
          setDesktopOpened(JSON.parse(saved));
        }
      } catch (e) {
        console.error("Fehler beim Laden des Sidebar-Status", e);
      }
    };
    loadSidebarState();
  }, []);

  // Zustand speichern
  useEffect(() => {
    localStorage.setItem("sidebar-opened", JSON.stringify(desktopOpened));
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
                {desktopOpened ? "Q-Matrix" : "QM"}
              </Title>

              {/* Versions-Badge */}
              {desktopOpened && (
                <Badge
                  variant="subtle"
                  color="gray"
                  size="xs"
                  styles={{ root: { textTransform: "none", opacity: 0.7 } }}
                >
                  {APP_VERSION}
                </Badge>
              )}
            </Group>
          </Group>
          <ColorSchemeToggle />
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
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
          {activeTab === "matrix" && <SkillMatrix />}
          {activeTab === "data" && <UnifiedDataView />}
          {activeTab === "system" && <DataManagement />}
        </div>
      </AppShell.Main>
    </AppShell>
  );
}

function App() {
  const [colorScheme, setColorScheme] = useLocalStorage({
    key: "qmatrix-color-scheme",
    defaultValue: "light",
  });

  return (
    <MantineProvider theme={theme} defaultColorScheme={colorScheme}>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </MantineProvider>
  );
}

export default App;
