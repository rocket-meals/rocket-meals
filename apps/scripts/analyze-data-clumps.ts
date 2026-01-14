import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

const DATA_CLUMPS_REPO = "https://github.com/NilsBaumgartner1994/data-clumps-doctor";
const SOURCE_LANGUAGE_TYPE = "typescript";
const RELATIVE_SOURCE_PATH = ".";

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const OUTPUT_PATH = path.join(REPO_ROOT, "reports", "data-clumps-doctor", "data-clumps.json");
const BADGE_OUTPUT_PATH = path.join(
  REPO_ROOT,
  "reports",
  "data-clumps-doctor",
  "badges",
  "data-clumps.svg"
);

function runCommand(command: string, cwd?: string) {
  console.log(`\n$ ${command}`);
  execSync(command, { stdio: "inherit", cwd });
}

function cloneDataClumpsDoctor(tempDir: string) {
  const targetDir = path.join(tempDir, "data-clumps-doctor");
  runCommand(`git clone ${DATA_CLUMPS_REPO} "${targetDir}"`);
  return targetDir;
}

function buildDataClumpsDoctor(repoDir: string) {
  runCommand("yarn install --immutable", repoDir);
  runCommand("yarn build", repoDir);
}

function ensureOutputPaths() {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.mkdirSync(path.dirname(BADGE_OUTPUT_PATH), { recursive: true });
}

function runAnalysis(repoDir: string) {
  const cliPath = path.join(repoDir, "build", "ignoreCoverage", "cli.js");

  let cliOptions = {
    "source_type": SOURCE_LANGUAGE_TYPE,
    "commit_selection": "current",
    "output": OUTPUT_PATH,
    "path_to_project": REPO_ROOT,
    "relative_path_to_source_folder_in_project": RELATIVE_SOURCE_PATH,
    "detector_options_paths_ignored_in_detection_comparison": [
        "**/databaseTypes/types.ts",
        ]
  };

  let cliArgs = Object.entries(cliOptions).map(([key, value]) => {
    if (Array.isArray(value)) {
      return value.map(v => `--${key} "${v}"`).join(" ");
    } else {
      return `--${key} "${value}"`;
    }
  });

  /**
  runCommand(
    `node "${cliPath}" --source_type "${SOURCE_LANGUAGE_TYPE}" --commit_selection current --output "${OUTPUT_PATH}" --path_to_project "${REPO_ROOT}" --relative_path_to_source_folder_in_project "${RELATIVE_SOURCE_PATH}"`
  );
  */

  runCommand(
      `node "${cliPath}" ${cliArgs.join(" ")}`
  );
}

function readDataClumpsCount(reportPath: string): number {
  const rawReport = fs.readFileSync(reportPath, "utf-8");
  const parsed = JSON.parse(rawReport);
  const count: unknown = parsed?.report_summary?.amount_data_clumps;

  if (typeof count !== "number") {
    throw new Error("Unable to determine data clumps count from report");
  }

  return count;
}

function badgeColorForCount(count: number) {
  if (count <= 10) return "#08A008";
  if (count <= 100) return "#FE7D37";
  return "#F85149";
}

function generateBadge(count: number, outputPath: string) {
  const label = "data clumps";
  const status = `${count}`;
  const color = badgeColorForCount(count);
  const labelWidth = 6 * label.length + 20;
  const statusWidth = 6 * status.length + 20;
  const totalWidth = labelWidth + statusWidth;

  const svg = `<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"${totalWidth}\" height=\"20\" role=\"img\" aria-label=\"${label}: ${status}\">` +
    `<linearGradient id=\"smooth\" x2=\"0\" y2=\"100%\"><stop offset=\"0\" stop-color=\"#bbb\" stop-opacity=\".1\"/><stop offset=\"1\" stop-opacity=\".1\"/></linearGradient>` +
    `<rect rx=\"3\" width=\"${totalWidth}\" height=\"20\" fill=\"#555\"/>` +
    `<rect rx=\"3\" x=\"${labelWidth}\" width=\"${statusWidth}\" height=\"20\" fill=\"${color}\"/>` +
    `<path fill=\"${color}\" d=\"M${labelWidth} 0h4v20h-4z\"/>` +
    `<rect rx=\"3\" width=\"${totalWidth}\" height=\"20\" fill=\"url(#smooth)\"/>` +
    `<g fill=\"#fff\" text-anchor=\"middle\" font-family=\"Verdana,DejaVu Sans,Geneva,sans-serif\" font-size=\"11\">` +
    `<text x=\"${labelWidth / 2}\" y=\"14\">${label}</text>` +
    `<text x=\"${labelWidth + statusWidth / 2}\" y=\"14\">${status}</text>` +
    `</g>` +
    `</svg>`;

  fs.writeFileSync(outputPath, svg);
  console.log(`Badge written to ${outputPath}`);
}

function cleanupTempDir(tempDir: string) {
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log(`Cleaned up ${tempDir}`);
}

async function main() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "data-clumps-doctor-"));

  try {
    console.log("Preparing data clumps analysis...");
    ensureOutputPaths();

    let repoDir: string | null = null;
    let localRepoDir = "/Users/nilsbaumgartner/Documents/GitHub/data-clumps-doctor";

    if( fs.existsSync(localRepoDir)) {
      console.log("Using local data-clumps-doctor repo at "+localRepoDir);
      repoDir = localRepoDir;
    } else {
      repoDir = cloneDataClumpsDoctor(tempDir);
    }

    buildDataClumpsDoctor(repoDir);
    runAnalysis(repoDir);

    const count = readDataClumpsCount(OUTPUT_PATH);
    generateBadge(count, BADGE_OUTPUT_PATH);

    console.log("Data clumps analysis completed.");
  } finally {
    cleanupTempDir(tempDir);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
