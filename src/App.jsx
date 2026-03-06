import { useState, useEffect, useCallback } from "react";
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
import { useDisclosure, useLocalStorage, useHotkeys } from "@mantine/hooks";
import { notifications } from "@mantine/notifications";
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
  IconHistory,
  IconShieldLock,
  IconPower,
} from "@tabler/icons-react";

import { modals } from "@mantine/modals";
import { useStore } from "./store/useStore";
import { UnifiedDataView } from "./components/UnifiedDataView";
import { SkillMatrix } from "./components/SkillMatrix";
import { DataManagement } from "./components/DataManagement";
import { Dashboard } from "./components/Dashboard/Dashboard";
import { QualificationPlan } from "./components/QualificationPlan";
import { WelcomeModal } from "./components/WelcomeModal";
import { ChangelogModal } from "./components/ChangelogModal";
import { PrivacyModal } from "./components/PrivacyModal";
import { HistoryDrawer } from "./components/shared/HistoryDrawer";
import { PrivacyProvider, usePrivacy } from "./context/PrivacyContext";
import { ModalsProvider } from "@mantine/modals";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";

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
});

const APP_VERSION = `v${__APP_VERSION__}`;

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

function SaveButton({ hasUnsavedChanges, onSave, lastUpdate }) {
  const [wiggleAngle, setWiggleAngle] = useState(0);

  const formatTime = (timestamp) => {
    if (!timestamp) return null;
    return new Date(timestamp).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const lastUpdateStr = formatTime(lastUpdate);
  const tooltipLabel = lastUpdateStr
    ? `Schnellspeicherung (Letzte Änderung: ${lastUpdateStr})`
    : "Schnellspeicherung (Backup Export)";

  useEffect(() => {
    let outerInterval;
    let wiggleSequence;
    if (hasUnsavedChanges) {
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

      // Play initially
      playWiggle();

      // Trigger sequence every 10 seconds
      outerInterval = setInterval(() => {
        playWiggle();
      }, 10000);
    } else {
      setWiggleAngle(0);
    }

    return () => {
      clearInterval(outerInterval);
      clearInterval(wiggleSequence);
    };
  }, [hasUnsavedChanges]);

  return (
    <Tooltip label={tooltipLabel}>
      <ActionIcon
        variant="subtle"
        color="gray"
        size="md"
        onClick={() => onSave()}
        style={{ position: "relative" }}
      >
        <div className={hasUnsavedChanges ? "forced-wiggle-animation" : ""} style={{ transform: `rotate(${wiggleAngle}deg)`, transition: "transform 0.15s ease-in-out" }}>
          <IconDeviceFloppy size={18} />
        </div>
        {hasUnsavedChanges && (
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

function ResetAndCloseButton() {
  const { clearAllData, exportData } = useStore();

  const handleResetAndClose = () => {
    modals.openConfirmModal({
      title: 'Speichern, zurücksetzen & beenden',
      centered: true,
      children: (
        <Text size="sm">
          Es wird zuerst ein <strong>Backup exportiert</strong>, dann alle Daten unwiderruflich gelöscht und die Anwendung geschlossen. Möchten Sie fortfahren?
        </Text>
      ),
      labels: { confirm: 'Exportieren, löschen & schließen', cancel: 'Abbrechen' },
      confirmProps: { color: 'red', leftSection: <IconPower size={14} /> },
      onConfirm: async () => {
        try {
          await exportData();
          notifications.show({ title: 'Backup erstellt', message: 'Daten werden jetzt gelöscht...', color: 'blue', autoClose: 1500 });
          await new Promise(r => setTimeout(r, 1000));
          await clearAllData();
          notifications.show({ title: 'Zurückgesetzt', message: 'Alle Daten wurden gelöscht.', color: 'blue', autoClose: 1500 });
          setTimeout(() => window.close(), 1200);
        } catch (error) {
          notifications.show({ title: 'Fehler', message: 'Fehler beim Vorgang.', color: 'red' });
        }
      },
    });
  };

  return (
    <Tooltip label="Alle Daten löschen & Anwendung schließen">
      <ActionIcon
        variant="subtle"
        color="red"
        size="md"
        onClick={handleResetAndClose}
      >
        <IconPower size={18} />
      </ActionIcon>
    </Tooltip>
  );
}

function AppContent() {
  const { loading, exportData, projectTitle, updateProjectTitle, changeHistory, undoChange, initDb, hasUnsavedChanges } = useStore();

  useEffect(() => {
    initDb();
  }, [initDb]);
  const computedColorScheme = useComputedColorScheme("light");

  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = computedColorScheme === 'dark' ? '#141517' : '#ffffff';
  }, [computedColorScheme]);

  const [activeTab, setActiveTab] = useLocalStorage({
    key: 'skillgrid-active-tab',
    defaultValue: 'matrix',
  });

  // Navigation params for cross-module jumping (e.g. Matrix -> QualPlan)
  const [navParams, setNavParams] = useState(null);

  const handleNavigate = useCallback((tab, params) => {
    setNavParams(params);
    setActiveTab(tab);
  }, [setActiveTab]);

  const handleClearParams = useCallback(() => {
    setNavParams(null);
  }, []);

  // Title edit state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("");

  const [changelogOpened, { open: openChangelog, close: closeChangelog }] = useDisclosure(false);
  const [privacyOpened, { open: openPrivacy, close: closePrivacy }] = useDisclosure(false);

  // History drawer state
  const [historyOpened, { open: openHistory, close: closeHistory }] = useDisclosure(false);

  const lastUpdate = changeHistory.length > 0 ? changeHistory[0].timestamp : null;

  // Global Undo Shortcut (Ctrl+Z) - only when not in input fields
  useHotkeys([
    ['mod+z', () => {
      // Find the most recent undoable entry
      const lastUndoable = changeHistory.find(h => !h.undone);
      if (lastUndoable) {
        undoChange(lastUndoable.id).then(() => {
          notifications.show({
            title: 'Rückgängig',
            message: `"${lastUndoable.entityLabel}" wurde rückgängig gemacht`,
            color: 'blue',
            autoClose: 3000,
          });
        }).catch((err) => {
          notifications.show({
            title: 'Fehler',
            message: err.message || 'Konnte nicht rückgängig gemacht werden',
            color: 'red',
          });
        });
      } else {
        notifications.show({
          title: 'Nichts zum Rückgängig machen',
          message: 'Es gibt keine weiteren Änderungen in der Historie',
          color: 'gray',
          autoClose: 2000,
        });
      }
    }],
  ]);

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
      transitionDuration={0}
      styles={{ root: { height: "100dvh" } }}
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
              {(() => {
                const logoColor = computedColorScheme === "dark" ? "#4DA6FF" : "#007BFF";
                return (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 128 128"
                    width={desktopOpened ? 32 : 28}
                    height={desktopOpened ? 32 : 28}
                    style={{ transition: "all 0.2s ease", flexShrink: 0 }}
                  >
                    <g transform="translate(14, 14)">
                      <rect x="0" y="0" width="100" height="100" style={{ stroke: logoColor, strokeWidth: 5, fill: "none" }} rx="12" ry="12" />
                      <line x1="33.3" y1="0" x2="33.3" y2="100" style={{ stroke: logoColor, strokeWidth: 5 }} />
                      <line x1="66.6" y1="0" x2="66.6" y2="100" style={{ stroke: logoColor, strokeWidth: 5 }} />
                      <line x1="0" y1="33.3" x2="100" y2="33.3" style={{ stroke: logoColor, strokeWidth: 5 }} />
                      <line x1="0" y1="66.6" x2="100" y2="66.6" style={{ stroke: logoColor, strokeWidth: 5 }} />
                      <circle cx="50" cy="16.65" r="9" fill={logoColor} />
                      <circle cx="83.35" cy="16.65" r="9" fill={logoColor} />
                      <circle cx="16.65" cy="50" r="9" fill={logoColor} />
                      <circle cx="50" cy="50" r="9" fill={logoColor} />
                      <circle cx="16.65" cy="83.35" r="9" fill={logoColor} />
                      <circle cx="83.35" cy="83.35" r="9" fill={logoColor} />
                    </g>
                  </svg>
                );
              })()}

              {desktopOpened && (
                <>
                  <Title
                    order={4}
                    c="blue"
                    style={{
                      letterSpacing: -0.5,
                      fontSize: "1.1rem",
                      transition: "all 0.2s ease",
                      userSelect: "none",
                    }}
                  >
                    SKILLGRID
                  </Title>

                  {/* Versions-Badge */}
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

                  {/* Datenschutz */}
                  <Tooltip label="Datenschutzerklärung">
                    <ActionIcon
                      variant="subtle"
                      color="green"
                      size="sm"
                      onClick={openPrivacy}
                      style={{ opacity: 0.7 }}
                    >
                      <IconShieldLock size={14} />
                    </ActionIcon>
                  </Tooltip>
                </>
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
            <SaveButton hasUnsavedChanges={hasUnsavedChanges} onSave={exportData} lastUpdate={lastUpdate} />
            <Tooltip label="Änderungshistorie">
              <ActionIcon
                variant="subtle"
                color="gray"
                size="md"
                onClick={openHistory}
              >
                <IconHistory size={18} />
              </ActionIcon>
            </Tooltip>
            <AnonymousToggle />
            <ColorSchemeToggle />
            <ResetAndCloseButton />
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
          height: "100dvh",
          minHeight: 0,
          overflow: "hidden",
          backgroundColor: computedColorScheme === "dark" ? "var(--mantine-color-dark-8)" : "#f8f9fa",
        }}
      >
        <div
          style={{
            width: "100%",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "auto",
            minHeight: 0,
          }}
        >
          {activeTab === "dashboard" && <Dashboard />}
          {activeTab === "matrix" && <SkillMatrix onNavigate={handleNavigate} />}
          {activeTab === "qualification" && <QualificationPlan initialEmployeeId={navParams?.employeeId} onClearParams={handleClearParams} />}
          {activeTab === "data" && <UnifiedDataView navParams={navParams} onClearParams={handleClearParams} />}
          {activeTab === "system" && <DataManagement />}
        </div>
      </AppShell.Main>
      <HistoryDrawer opened={historyOpened} onClose={closeHistory} />
      <WelcomeModal />
      <ChangelogModal opened={changelogOpened} onClose={closeChangelog} />
      <PrivacyModal opened={privacyOpened} onClose={closePrivacy} />
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

  const [colorScheme] = useLocalStorage({
    key: "skillgrid-color-scheme",
    defaultValue: "light",
  });

  return (
    <MantineProvider theme={theme} defaultColorScheme={colorScheme}>
      <Notifications />
      <ModalsProvider>
        <PrivacyProvider>
          <AppContent />
        </PrivacyProvider>
      </ModalsProvider>
    </MantineProvider>
  );
}

export default App;
