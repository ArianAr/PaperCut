import type { Config } from "tailwindcss";

const withAlpha = (channel: string) =>
  `rgb(var(${channel}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        vscode: {
          bg: withAlpha("--vscode-bg"),
          sidebar: withAlpha("--vscode-sidebar"),
          line: withAlpha("--vscode-line"),
          border: withAlpha("--vscode-border"),
          fg: withAlpha("--vscode-fg"),
          muted: withAlpha("--vscode-muted"),
          accent: withAlpha("--vscode-accent"),
          error: withAlpha("--vscode-error"),
          warn: withAlpha("--vscode-warn"),
          info: withAlpha("--vscode-info"),
          debug: withAlpha("--vscode-debug"),
          success: withAlpha("--vscode-success"),
          selection: withAlpha("--vscode-selection"),
          gutter: withAlpha("--vscode-gutter"),
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
