import { useState } from "react";
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
} from "@mantine/core";
import {
  IconUsers,
  IconTags,
  IconLayoutGrid,
  IconDatabase,
} from "@tabler/icons-react";

import { DataProvider, useData } from "./context/DataContext";
import { EmployeeList } from "./components/EmployeeList";
import { CategoryManager } from "./components/CategoryManager";
import { SkillMatrix } from "./components/SkillMatrix";
import { DataManagement } from "./components/DataManagement";
import "@mantine/core/styles.css";

const theme = createTheme({});

function AppContent() {
  const { loading } = useData();
  const [activeTab, setActiveTab] = useState("matrix");

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
    { value: "matrix", label: "Skill-Matrix", icon: IconLayoutGrid },
    { value: "employees", label: "Mitarbeiter", icon: IconUsers },
    { value: "categories", label: "Kategorien & Skills", icon: IconTags },
    { value: "data", label: "Datenverwaltung", icon: IconDatabase },
  ];

  return (
    <AppShell
      header={{ height: 70 }}
      navbar={{
        width: 250,
        breakpoint: "sm",
        collapsed: { mobile: true },
      }}
      // "padding={0}" entfernt die weißen Ränder komplett,
      // falls du den Platz bis zum Rand nutzen willst.
      padding="md"
      styles={{
        main: {
          width: "100%",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          // Verhindert, dass Mantine den Content auf eine max-width begrenzt
          flexGrow: 1,
        },
      }}
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Title order={3} c="blue">
            Skill Management System
          </Title>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        <Stack gap="xs">
          <Title
            order={6}
            mb="xs"
            c="dimmed"
            style={{ textTransform: "uppercase" }}
          >
            Navigation
          </Title>
          {navItems.map((item) => (
            <NavLink
              key={item.value}
              label={item.label}
              leftSection={<item.icon size={20} stroke={1.5} />}
              active={activeTab === item.value}
              onClick={() => setActiveTab(item.value)}
              variant="light"
              color="blue"
              style={{ borderRadius: 8 }}
            />
          ))}
        </Stack>
      </AppShell.Navbar>

      <AppShell.Main>
        {/* WICHTIG: width: 100% und kein max-width */}
        <div style={{ width: "100%", flex: 1 }}>
          {activeTab === "matrix" && <SkillMatrix />}
          {activeTab === "employees" && <EmployeeList />}
          {activeTab === "categories" && <CategoryManager />}
          {activeTab === "data" && <DataManagement />}
        </div>
      </AppShell.Main>
    </AppShell>
  );
}

function App() {
  return (
    <MantineProvider theme={theme}>
      <DataProvider>
        <AppContent />
      </DataProvider>
    </MantineProvider>
  );
}

export default App;
