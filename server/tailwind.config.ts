import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        vscode: {
          bg: "#1e1e1e",
          sidebar: "#252526",
          line: "#2d2d2d",
          border: "#3c3c3c",
          fg: "#d4d4d4",
          muted: "#858585",
          accent: "#007acc",
          error: "#f44747",
          warn: "#cca700",
          info: "#3794ff",
          debug: "#808080",
          success: "#89d185",
          selection: "#264f78",
          gutter: "#858585",
        },
      },
      fontFamily: {
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "Liberation Mono",
          "Courier New",
          "monospace",
        ],
      },
    },
  },
  plugins: [],
};

export default config;
