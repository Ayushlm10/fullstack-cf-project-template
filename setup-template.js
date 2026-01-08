#!/usr/bin/env bun
/**
 * Template Setup Script
 *
 * This script helps you initialize a new project from this template.
 * It will:
 * - Prompt for project details
 * - Update package names and scopes
 * - Remove template-specific files
 * - Initialize git repository
 * - Self-destruct after completion
 *
 * Usage: bun run setup-template.js
 */

import { readdir, readFile, writeFile, unlink, rm } from "node:fs/promises";
import { join } from "node:path";
import { exit } from "node:process";

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  red: "\x1b[31m",
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function prompt(question) {
  return new Promise((resolve) => {
    process.stdout.write(`${colors.cyan}${question}${colors.reset} `);
    process.stdin.once("data", (data) => {
      resolve(data.toString().trim());
    });
  });
}

async function updateJsonFile(filePath, updater) {
  try {
    const content = await readFile(filePath, "utf-8");
    const json = JSON.parse(content);
    const updated = updater(json);
    await writeFile(filePath, JSON.stringify(updated, null, "\t") + "\n");
    log(`  ✓ Updated ${filePath}`, colors.dim);
  } catch (error) {
    log(`  ✗ Failed to update ${filePath}: ${error.message}`, colors.red);
  }
}

async function updateTextFile(filePath, replacements) {
  try {
    let content = await readFile(filePath, "utf-8");
    let modified = false;

    for (const [search, replace] of replacements) {
      if (content.includes(search)) {
        content = content.replaceAll(search, replace);
        modified = true;
      }
    }

    if (modified) {
      await writeFile(filePath, content);
      log(`  ✓ Updated ${filePath}`, colors.dim);
    }
  } catch (error) {
    // File might not exist, skip silently
  }
}

async function updateWranglerRoutes(filePath, projectName, domain, zoneName, setWorkersDevFalse = false) {
  try {
    let content = await readFile(filePath, "utf-8");
    let modified = false;

    // Set workers_dev to false if custom domain is being used
    if (setWorkersDevFalse) {
      const workersDevRegex = /"workers_dev":\s*(true|false)/;
      if (workersDevRegex.test(content)) {
        content = content.replace(workersDevRegex, '"workers_dev": false');
        modified = true;
      }
    }

    // Find the Routes & Custom Domains section and replace it
    const routesConfig = `  // ============================================
  // Routes & Custom Domains
  // ============================================
  "routes": [
    {
      "pattern": "${domain}/*",
      "zone_name": "${zoneName}"
    }
  ],`;

    // Look for the entire Routes & Custom Domains comment block
    // This matches from the section header through the commented-out routes array
    const routesSectionRegex = /\/\/ ={3,}\n  \/\/ Routes & Custom Domains\n  \/\/ ={3,}\n(?:  \/\/[^\n]*\n)*?  \/\/ \],/;

    if (routesSectionRegex.test(content)) {
      content = content.replace(routesSectionRegex, routesConfig);
      modified = true;
    } else {
      log(`  ⚠ Could not match routes section pattern`, colors.yellow);
    }

    if (modified) {
      await writeFile(filePath, content);
      log(`  ✓ Configured routes in ${filePath}`, colors.dim);
      if (setWorkersDevFalse) {
        log(`  ✓ Set workers_dev: false`, colors.dim);
      }
    } else {
      log(`  ⚠ Could not find routes section in ${filePath}`, colors.yellow);
    }
  } catch (error) {
    log(`  ⚠ Could not update routes in ${filePath}: ${error.message}`, colors.yellow);
  }
}

async function main() {
  log("\n┌─────────────────────────────────────────┐", colors.bright);
  log("│  Fullstack Bun Monorepo Template Setup │", colors.bright);
  log("└─────────────────────────────────────────┘\n", colors.bright);

  log("This script will help you set up your new project.\n");

  // Collect project information
  const projectName = await prompt("Project name (e.g., my-app):");
  if (!projectName) {
    log("\n✗ Project name is required!", colors.red);
    exit(1);
  }

  const packageScope = await prompt("Package scope (e.g., @mycompany or leave empty):");
  const description = await prompt("Project description:");
  const author = await prompt("Author name:");

  // Domain configuration
  log("\n🌐 Domain Configuration (optional):", colors.bright);
  log("   Leave empty to use workers.dev only", colors.dim);
  const baseDomain = await prompt("Base domain (e.g., ayushthakur.work or leave empty):");

  let usePublicApi = false;
  let webDomain = "";
  let apiDomain = "";

  if (baseDomain) {
    webDomain = `${projectName}.${baseDomain}`;
    apiDomain = `${projectName}-api.${baseDomain}`;

    log(`\n   Web will be deployed to: ${webDomain}`, colors.dim);
    log(`   Worker will be private (RPC-only via service binding)`, colors.dim);

    const publicApiResponse = await prompt("\nDo you need a public API domain? (y/n):");
    usePublicApi = publicApiResponse.toLowerCase() === "y";

    if (usePublicApi) {
      log(`   API will also be public at: ${apiDomain}`, colors.dim);
    }
  }

  // Root package can have scope, but worker/web packages must match wrangler names (no scope)
  const rootPkgName = packageScope ? `${packageScope}/${projectName}` : projectName;

  log("\n📝 Project Configuration:", colors.bright);
  log(`   Name: ${projectName}`, colors.dim);
  log(`   Root Package: ${rootPkgName}`, colors.dim);
  log(`   Worker Package: ${projectName}-worker`, colors.dim);
  log(`   Web Package: ${projectName}-web`, colors.dim);
  log(`   Description: ${description}`, colors.dim);
  log(`   Author: ${author}`, colors.dim);
  if (baseDomain) {
    log(`   Web Domain: ${webDomain}`, colors.dim);
    log(
      `   Worker: Private (RPC-only)${usePublicApi ? ` + Public API at ${apiDomain}` : ""}`,
      colors.dim,
    );
  } else {
    log(`   Deployment: workers.dev subdomain`, colors.dim);
  }

  const confirm = await prompt("\nProceed with setup? (y/n):");
  if (confirm.toLowerCase() !== "y") {
    log("\n✗ Setup cancelled.", colors.yellow);
    exit(0);
  }

  log("\n🔧 Setting up project...\n", colors.bright);

  // Define package names (matching wrangler.jsonc naming without @ scope)
  const workerPkgName = `${projectName}-worker`;
  const webPkgName = `${projectName}-web`;

  // Update root package.json
  log("Updating package.json files...", colors.blue);
  await updateJsonFile("./package.json", (json) => ({
    ...json,
    name: rootPkgName,
    description: description || json.description,
    author: author || json.author,
    version: "0.1.0",
    scripts: {
      ...json.scripts,
      "dev:worker": `bun --filter ${workerPkgName} dev`,
      "dev:web": `bun --filter ${webPkgName} dev`,
      typecheck: `bun --filter ${workerPkgName} typecheck && bun --filter ${webPkgName} typecheck`,
    },
  }));

  // Update worker package.json (no @ scope to match wrangler name)
  await updateJsonFile("./packages/worker/package.json", (json) => ({
    ...json,
    name: workerPkgName,
    description: `Backend worker for ${projectName}`,
    author: author || json.author,
    version: "0.1.0",
  }));

  // Update web package.json (no @ scope to match wrangler name)
  await updateJsonFile("./packages/web/package.json", (json) => ({
    ...json,
    name: webPkgName,
    description: `Frontend web app for ${projectName}`,
    author: author || json.author,
    version: "0.1.0",
  }));

  // Update wrangler.jsonc files
  log("\nUpdating wrangler configurations...", colors.blue);
  await updateTextFile("./packages/worker/wrangler.jsonc", [
    ["fullstack-cf-project-template-worker", workerPkgName],
  ]);

  await updateTextFile("./packages/web/wrangler.jsonc", [
    ["fullstack-cf-project-template-web", webPkgName],
    ["fullstack-cf-project-template-worker", workerPkgName],
  ]);

  // Configure custom domains if provided
  if (baseDomain) {
    log("\nConfiguring custom domains...", colors.blue);

    // Always configure web domain and set workers_dev: false
    await updateWranglerRoutes(
      "./packages/web/wrangler.jsonc",
      projectName,
      webDomain,
      baseDomain,
      true // Set workers_dev: false for custom domain
    );

    // Only configure worker domain if public API is requested
    if (usePublicApi) {
      await updateWranglerRoutes(
        "./packages/worker/wrangler.jsonc",
        projectName,
        apiDomain,
        baseDomain,
        true // Set workers_dev: false for custom domain
      );
    } else {
      log("  ✓ Worker configured as private (RPC-only)", colors.dim);
    }
  }

  // Update source files that might reference package names
  log("\nUpdating source files...", colors.blue);
  const filesToUpdate = [
    "./README.md",
    "./packages/web/src/routes/index.tsx",
    "./packages/web/env.d.ts",
    "./packages/web/worker-configuration.d.ts",
  ];

  for (const file of filesToUpdate) {
    await updateTextFile(file, [
      ["fullstack-cf-project-template-worker", workerPkgName],
      ["fullstack-cf-project-template-web", webPkgName],
      ["fullstack-cf-project-template", projectName],
    ]);
  }

  // Remove template-specific files
  log("\nCleaning up template files...", colors.blue);
  try {
    await unlink("./CLAUDE.md");
    log("  ✓ Removed CLAUDE.md", colors.dim);
  } catch (error) {
    // File might not exist
  }

  try {
    await unlink("./TEMPLATE_SETUP.md");
    log("  ✓ Removed TEMPLATE_SETUP.md", colors.dim);
  } catch (error) {
    // File might not exist
  }

  // Initialize git repository if not already initialized
  log("\nInitializing git repository...", colors.blue);
  try {
    const { exited } = Bun.spawn(["git", "rev-parse", "--git-dir"], {
      stdout: "ignore",
      stderr: "ignore",
    });
    const exitCode = await exited;

    if (exitCode !== 0) {
      // Not a git repo, initialize it
      await Bun.spawn(["git", "init"], { stdout: "inherit" }).exited;
      await Bun.spawn(["git", "add", "."], { stdout: "inherit" }).exited;
      await Bun.spawn(["git", "commit", "-m", "Initial commit from template"], {
        stdout: "inherit",
      }).exited;
      log("  ✓ Git repository initialized", colors.dim);
    } else {
      log("  ✓ Git repository already exists", colors.dim);
    }
  } catch (error) {
    log("  ⚠ Failed to initialize git repository", colors.yellow);
  }

  // Self-destruct
  log("\n🗑️  Removing setup script...", colors.blue);
  try {
    await unlink("./setup-template.js");
    log("  ✓ Setup script removed", colors.dim);
  } catch (error) {
    log("  ⚠ Could not remove setup script, please delete manually", colors.yellow);
  }

  log("\n┌─────────────────────────────────────┐", colors.green);
  log("│  ✓ Setup Complete!                  │", colors.green);
  log("└─────────────────────────────────────┘\n", colors.green);

  log("Next steps:", colors.bright);
  log("  1. Run: bun install", colors.dim);
  log("  2. Review .env.example files and create .env files", colors.dim);
  log("  3. Add your Cloudflare account_id to wrangler.jsonc files:", colors.dim);
  log("     - packages/worker/wrangler.jsonc", colors.dim);
  log("     - packages/web/wrangler.jsonc", colors.dim);

  if (baseDomain) {
    log("\n  Configuration applied:", colors.bright);
    log(`  ✓ Web domain configured: ${webDomain}`, colors.green);
    log(`  ✓ workers_dev set to false (using custom domain)`, colors.green);
    if (usePublicApi) {
      log(`  ✓ API domain configured: ${apiDomain}`, colors.green);
      log(`  ✓ Worker has public API + RPC access`, colors.green);
    } else {
      log(`  ✓ Worker is private (RPC-only, no public URL)`, colors.green);
    }

    log("\n  Before deploying:", colors.bright);
    log(`  4. Ensure ${baseDomain} is added to your Cloudflare account`, colors.dim);
    log("     (Go to dash.cloudflare.com → Add Site)", colors.dim);
    log("  5. Verify routes in wrangler.jsonc files are correct", colors.dim);
    log("  6. Start development: bun dev:worker & bun dev:web", colors.dim);
    log(`  7. Deploy: Web → ${webDomain}${usePublicApi ? `, API → ${apiDomain}` : ""}`, colors.dim);
    log("  8. Read README.md for detailed documentation\n", colors.dim);
  } else {
    log("\n  Configuration applied:", colors.bright);
    log("  ✓ Will deploy to workers.dev subdomain", colors.green);
    log("  ✓ workers_dev set to true", colors.green);

    log("\n  Continue setup:", colors.bright);
    log("  4. Start development: bun dev:worker & bun dev:web", colors.dim);
    log("  5. Deploy: Will use workers.dev subdomain", colors.dim);
    log("  6. Read README.md for detailed documentation\n", colors.dim);
  }

  process.exit(0);
}

// Enable stdin
process.stdin.setEncoding("utf-8");
process.stdin.resume();

main().catch((error) => {
  log(`\n✗ Setup failed: ${error.message}`, colors.red);
  process.exit(1);
});
