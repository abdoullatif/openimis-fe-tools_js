import React from "react";
import {Ballot, ImportExport, SaveAlt} from "@material-ui/icons";
import ToolsMainMenu from "./components/ToolsMainMenu";
import RegistersPage from "./pages/RegistersPage";
import { PolicyRenewalsPage } from "./pages/PolicyRenewalsPage";
import { FeedbackPromptsPage } from "./pages/FeedbackPromptsPage";
import { ExtractsPage } from "./pages/ExtractsPage";
import { UtilitiesPage } from "./pages/UtilitiesPage";
import { EmailSettingsPage } from "./pages/EmailSettingsPage";
import ReportsPage from "./pages/ReportsPage";

import messages_en from "./translations/en.json";
import messages_fr from "./translations/fr.json";
import ReportDefinitionEditorDialog from "./components/ReportDefinitionEditorDialog";
import ReportPicker from "./components/ReportPicker";
import { RIGHT_REGISTERS, RIGHT_REPORTS, RIGHT_EXTRACTS } from "./constants";

function enablers(rights, enablers) {
  var e;
  for (e of enablers) {
    if (rights.includes(e)) return true;
  }
  return false;
};

const DEFAULT_CONFIG = {
  "translations": [
    { key: "en", messages: messages_en },
    { key: "fr", messages: messages_fr },
  ],
  "refs": [
    { key: "tools.reports", ref: "tools/reports" },
    { key: "tools.ReportDefinitionEditorDialog", ref: ReportDefinitionEditorDialog },
    { key: "tools.ReportPicker", ref: ReportPicker },
  ],
  "core.Router": [
    { path: "tools/registers", component: RegistersPage },
    { path: "tools/policyRenewals", component: PolicyRenewalsPage },
    { path: "tools/feedbackPrompts", component: FeedbackPromptsPage },
    { path: "tools/extracts", component: ExtractsPage },
    { path: "tools/reports", component: ReportsPage },
    { path: "tools/utilities", component: UtilitiesPage },
    { path: "tools/emailSettings", component: EmailSettingsPage },
  ],
  "core.MainMenu": [{ name: 'ToolsMainMenu', component: ToolsMainMenu }],
  "tools.MainMenu": [
    {
      text: { module: "tools", id: "menu.registers" },
      icon: <ImportExport />,
      route: "/tools/registers",
      id: "tools.registers",
      filter: (rights) => enablers(rights, RIGHT_REGISTERS),
    },
    {
      text: { module: "tools", id: "menu.extracts" },
      icon: <SaveAlt />,
      route: "/tools/extracts",
      id: "tools.extracts",
      filter: (rights) => enablers(rights, RIGHT_EXTRACTS),
    },
    {
      text: { module: "tools", id: "menu.reports" },
      icon: <Ballot />,
      route: "/tools/reports",
      id: "tools.reports",
      filter: (rights) => enablers(rights, RIGHT_REPORTS),
    },
  ],
};

export const ToolsModule = (cfg) => {
  return { ...DEFAULT_CONFIG, ...cfg };
};
