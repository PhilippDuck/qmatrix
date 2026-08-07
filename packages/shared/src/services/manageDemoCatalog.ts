/**
 * Demo catalog seed for SkillGrid Manage (content only, no release version).
 */

import type { CatalogPackage } from "../types/catalog";
import {
  CATALOG_FORMAT,
  CATALOG_FORMAT_VERSION,
} from "../types/catalog";

const id = (suffix: string) => `demo-${suffix}`;

/**
 * Realistic German IT skill catalog for demos and screenshots.
 */
export function buildManageDemoCatalogPackage(): CatalogPackage {
  const now = new Date().toISOString();

  const categories = [
    {
      id: id("cat-tech"),
      name: "Technik",
      description: "Fachliche technische Kompetenzen",
    },
    {
      id: id("cat-method"),
      name: "Methoden",
      description: "Arbeits- und Projektmethoden",
    },
    {
      id: id("cat-soft"),
      name: "Persönliche Kompetenzen",
      description: "Kommunikation, Führung, Zusammenarbeit",
    },
  ];

  const subcategories = [
    {
      id: id("sub-lang"),
      categoryId: id("cat-tech"),
      name: "Programmiersprachen",
      description: "Sprachen und Laufzeiten",
    },
    {
      id: id("sub-web"),
      categoryId: id("cat-tech"),
      name: "Web & Frontend",
      description: "UI, Frameworks, Accessibility",
    },
    {
      id: id("sub-data"),
      categoryId: id("cat-tech"),
      name: "Daten & Backend",
      description: "APIs, Datenbanken, Integration",
    },
    {
      id: id("sub-agile"),
      categoryId: id("cat-method"),
      name: "Agile Arbeitsweisen",
      description: "Scrum, Kanban, Planung",
    },
    {
      id: id("sub-quality"),
      categoryId: id("cat-method"),
      name: "Qualität & Testing",
      description: "Teststrategie und Codequalität",
    },
    {
      id: id("sub-collab"),
      categoryId: id("cat-soft"),
      name: "Zusammenarbeit",
      description: "Team und Stakeholder",
    },
  ];

  const skills = [
    {
      id: id("sk-ts"),
      subCategoryId: id("sub-lang"),
      name: "TypeScript",
      description: "Typen, Tooling, moderne JS-Features",
    },
    {
      id: id("sk-py"),
      subCategoryId: id("sub-lang"),
      name: "Python",
      description: "Scripting, APIs, Datenverarbeitung",
    },
    {
      id: id("sk-react"),
      subCategoryId: id("sub-web"),
      name: "React",
      description: "Komponenten, Hooks, State",
    },
    {
      id: id("sk-a11y"),
      subCategoryId: id("sub-web"),
      name: "Barrierefreiheit (a11y)",
      description: "WCAG, semantisches HTML, Keyboard",
    },
    {
      id: id("sk-node"),
      subCategoryId: id("sub-data"),
      name: "Node.js / API-Design",
      description: "REST, Validierung, Fehlerbehandlung",
    },
    {
      id: id("sk-sql"),
      subCategoryId: id("sub-data"),
      name: "SQL / relationale DB",
      description: "Abfragen, Modellierung, Indizes",
    },
    {
      id: id("sk-scrum"),
      subCategoryId: id("sub-agile"),
      name: "Scrum",
      description: "Events, Rollen, Artefakte",
    },
    {
      id: id("sk-estimation"),
      subCategoryId: id("sub-agile"),
      name: "Schätzung & Planung",
      description: "Story Points, Forecast, Priorisierung",
    },
    {
      id: id("sk-unit"),
      subCategoryId: id("sub-quality"),
      name: "Unit Testing",
      description: "Testpyramide, Mocks, Coverage",
    },
    {
      id: id("sk-review"),
      subCategoryId: id("sub-quality"),
      name: "Code Review",
      description: "Feedback, Standards, Pairing",
    },
    {
      id: id("sk-comm"),
      subCategoryId: id("sub-collab"),
      name: "Kommunikation",
      description: "Klarheit, Dokumentation, Präsentation",
    },
    {
      id: id("sk-mentor"),
      subCategoryId: id("sub-collab"),
      name: "Mentoring",
      description: "Coaching, Onboarding, Wissenstransfer",
    },
  ];

  const roles = [
    {
      id: id("role-junior"),
      name: "Junior Developer",
      description: "Einstieg in Produktentwicklung",
      icon: "IconUser",
      requiredSkills: [
        { skillId: id("sk-ts"), level: 25 },
        { skillId: id("sk-react"), level: 25 },
        { skillId: id("sk-unit"), level: 25 },
        { skillId: id("sk-comm"), level: 50 },
      ],
    },
    {
      id: id("role-senior"),
      name: "Senior Developer",
      description: "Eigenverantwortliche Umsetzung und Architektur",
      icon: "IconCode",
      inheritsFromId: id("role-junior"),
      requiredSkills: [
        { skillId: id("sk-ts"), level: 75 },
        { skillId: id("sk-react"), level: 75 },
        { skillId: id("sk-node"), level: 75 },
        { skillId: id("sk-sql"), level: 50 },
        { skillId: id("sk-review"), level: 75 },
        { skillId: id("sk-mentor"), level: 50 },
      ],
    },
    {
      id: id("role-sm"),
      name: "Scrum Master",
      description: "Agile Facilitation und Team-Entwicklung",
      icon: "IconUsersGroup",
      requiredSkills: [
        { skillId: id("sk-scrum"), level: 75 },
        { skillId: id("sk-estimation"), level: 50 },
        { skillId: id("sk-comm"), level: 75 },
        { skillId: id("sk-mentor"), level: 50 },
      ],
    },
    {
      id: id("role-po"),
      name: "Product Owner",
      description: "Priorisierung und Stakeholder-Management",
      icon: "IconTargetArrow",
      requiredSkills: [
        { skillId: id("sk-estimation"), level: 75 },
        { skillId: id("sk-scrum"), level: 50 },
        { skillId: id("sk-comm"), level: 75 },
        { skillId: id("sk-a11y"), level: 25 },
      ],
    },
  ];

  return {
    format: CATALOG_FORMAT,
    formatVersion: CATALOG_FORMAT_VERSION,
    meta: {
      catalogId: id("catalog-line"),
      name: "Demo-Katalog IT",
      version: "0.0.0",
      publishedAt: now,
      publisher: "SkillGrid Manage Demo",
      changelog: [
        {
          version: "0.0.0",
          date: now.slice(0, 10),
          notes:
            "Demo-Inhalte für Präsentationen — bitte in Manage versionieren und freigeben",
        },
      ],
      minAppFormatVersion: 1,
      partial: false,
    },
    entities: {
      categories,
      subcategories,
      skills,
      roles,
    },
  };
}

export function manageDemoCatalogSummary(): {
  categories: number;
  subcategories: number;
  skills: number;
  roles: number;
} {
  const pkg = buildManageDemoCatalogPackage();
  return {
    categories: pkg.entities.categories.length,
    subcategories: pkg.entities.subcategories.length,
    skills: pkg.entities.skills.length,
    roles: pkg.entities.roles.length,
  };
}
