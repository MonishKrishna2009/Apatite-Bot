import { beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let envContent = "";
let envLines = [];
let variableLines = [];

const sectionOrder = [
  "# Discord Stuff",
  "# Database Stuff",
  "# Logging Stuff",
  "#Ticket Stuff",
  "#LFP LFT Stuff",
];

const requiredVariables = {
  discord: ["TOKEN", "CLIENT_ID", "CLIENT_SECRET"],
  database: ["MONGO_URI"],
  logging: [
    "LOG_WEBHOOK",
    "SERVER_LOG_CHANNEL_ID",
    "MEMBER_LOG_CHANNEL_ID",
    "VOICE_LOG_CHANNEL_ID",
    "MESSAGE_LOG_CHANNEL_ID",
    "WARN_LOG_CHANNEL_ID",
  ],
  ticket: [
    "TICKET_LOG_CHANNEL_ID",
    "TICKET_DASH_CHANNEL_ID",
    "TICKET_SUPPORT_ROLE_ID",
    "TICKET_TRANSCRIPT_CHANNEL_ID",
    "TICKET_CATEGORY",
  ],
  lf: ["LF_ACTION_LOG_CHANNEL_ID", "LF_MOD_ROLE_ID"],
};

beforeAll(() => {
  const envPath = path.join(__dirname, "..", ".env.example");
  envContent = readFileSync(envPath, "utf8");
  envLines = envContent.split(/\r?\n/);
  variableLines = envLines
    .map((line) => line.trim());
});

describe(".env.example template", () => {
  test("file is not empty", () => {
    expect(envContent.length > 0).toBe(true);
  });

  test("sections appear once and in logical order", () => {
    const positions = sectionOrder.map((section) => envContent.indexOf(section));
    positions.forEach((pos) => {
      expect(pos >= 0).toBe(true);
    });
    for (let i = 1; i < positions.length; i += 1) {
      expect(positions[i] > positions[i - 1]).toBe(true);
    }
  });

  test("every variable uses KEY = \"\" formatting", () => {
    const pattern = /^[A-Z_][A-Z0-9_]*\s*=\s*""$/;
    variableLines.forEach((line) => {
      expect(pattern.test(line)).toBe(true);
    });
  });

  test("all required variables are present", () => {
    const variableNames = new Set(
      variableLines.map((line) => line.split("=")[0].trim())
    );
    Object.values(requiredVariables).forEach((group) => {
      group.forEach((name) => {
        expect(variableNames.has(name)).toBe(true);
      });
    });
  });

  test("contains no duplicate variable names", () => {
    const names = variableLines.map((line) => line.split("=")[0].trim());
    const uniqueCount = new Set(names).size;
    expect(uniqueCount).toBe(names.length);
  });

  test("placeholders remain empty strings", () => {
    variableLines.forEach((line) => {
      const value = line.split("=")[1].trim();
      expect(value).toBe('""');
    });
  });

  test("guards against accidental secrets", () => {
    const suspiciousPatterns = [
      /[A-Za-z0-9]{20,}/,
      /mongodb:\/\//,
      /https:\/\/discord(?:app)?\.com\/api\/webhooks/,
      /\d{17,19}/,
    ];
    variableLines.forEach((line) => {
      suspiciousPatterns.forEach((pattern) => {
        expect(pattern.test(line)).toBe(false);
      });
    });
  });

  test("documents a comprehensive set of variables", () => {
    expect(variableLines.length >= 17).toBe(true);
  });
});