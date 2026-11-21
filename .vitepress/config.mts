import { defineConfig } from "vitepress";

export default defineConfig({
  title: "SNReg",
  description: "Self-hosted, Linux-first IT operations: identity, devices, assets and tickets.",
  srcExclude: ["README.md", "AGENTS.md", "CLAUDE.md"],
  themeConfig: {
    nav: [
      { text: "Self-hosting", link: "/self-hosting/" },
      { text: "Admin guide", link: "/admin/" },
      { text: "User guide", link: "/user/" },
      { text: "ADRs", link: "/adr/" },
    ],
    sidebar: {
      "/self-hosting/": [{ text: "Self-hosting", items: [{ text: "Install", link: "/self-hosting/" }, { text: "Enrolling devices", link: "/self-hosting/device-login" }] }],
      "/adr/": [
        {
          text: "Architecture decisions",
          items: [
            { text: "0001 Architecture", link: "/adr/0001-architecture" },
            { text: "0002 UEID", link: "/adr/0002-ueid" },
            { text: "0003 Event bus delivery", link: "/adr/0003-event-bus-delivery" },
            { text: "0004 Identity choices (P1)", link: "/adr/0004-identity-p1-choices" },
            { text: "0005 Device management choices (P2)", link: "/adr/0005-device-management-p2-choices" },
          ],
        },
      ],
    },
  },
});
