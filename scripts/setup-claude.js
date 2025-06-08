#!/usr/bin/env node

// Auto-setup script for Claude Desktop MCP configuration
// This script automatically configures Claude Desktop to use the Bitkub MCP server

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir, platform } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const PROJECT_PATH = resolve(process.cwd());
const DIST_PATH = join(PROJECT_PATH, 'dist', 'index.js');

// Claude Desktop config file locations by platform
const CONFIG_PATHS = {
  darwin: join(homedir(), 'Library', 'Application Support', 'Claude', 'claude_desktop_config.json'),
  win32: join(homedir(), 'AppData', 'Roaming', 'Claude', 'claude_desktop_config.json'),
  linux: join(homedir(), '.config', 'Claude', 'claude_desktop_config.json'),
};

function getConfigPath() {
  const configPath = CONFIG_PATHS[platform()];
  if (!configPath) {
    throw new Error(`Unsupported platform: ${platform()}`);
  }
  return configPath;
}

function ensureConfigDir(configPath) {
  const configDir = dirname(configPath);
  if (!existsSync(configDir)) {
    console.log(`📁 Creating Claude config directory: ${configDir}`);
    mkdirSync(configDir, { recursive: true });
  }
}

function readExistingConfig(configPath) {
  if (!existsSync(configPath)) {
    console.log('📄 No existing Claude config found, creating new one...');
    return {};
  }

  try {
    const content = readFileSync(configPath, 'utf8');
    const config = JSON.parse(content);
    console.log('📖 Found existing Claude config');
    return config;
  } catch (error) {
    console.log('⚠️  Existing config file is invalid, creating backup and starting fresh...');
    const backupPath = `${configPath}.backup.${Date.now()}`;
    const content = readFileSync(configPath, 'utf8');
    writeFileSync(backupPath, content);
    console.log(`💾 Backup saved to: ${backupPath}`);
    return {};
  }
}

function updateConfig(config) {
  // Initialize mcpServers if it doesn't exist
  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  // Add or update bitkub server config
  config.mcpServers.bitkub = {
    command: 'node',
    args: [DIST_PATH],
    cwd: PROJECT_PATH,
  };

  return config;
}

function writeConfig(configPath, config) {
  const configJson = JSON.stringify(config, null, 2);
  writeFileSync(configPath, configJson, 'utf8');
}

function validateSetup() {
  if (!existsSync(DIST_PATH)) {
    console.error('❌ Build files not found! Please run "npm run build" first');
    process.exit(1);
  }
}

function main() {
  console.log('🚀 Setting up Bitkub MCP for Claude Desktop...\n');

  try {
    // Validate project is built
    validateSetup();

    // Get config file path
    const configPath = getConfigPath();
    console.log(`📍 Claude config location: ${configPath}`);

    // Ensure config directory exists
    ensureConfigDir(configPath);

    // Read existing config
    const existingConfig = readExistingConfig(configPath);

    // Update config with bitkub server
    const newConfig = updateConfig(existingConfig);

    // Write updated config
    writeConfig(configPath, newConfig);

    console.log('\n✅ Successfully configured Claude Desktop!');
    console.log('\n📋 What was added to your Claude config:');
    console.log(JSON.stringify(newConfig.mcpServers.bitkub, null, 2));

    console.log('\n🔄 Next steps:');
    console.log('1. Close Claude Desktop completely');
    console.log('2. Reopen Claude Desktop');
    console.log('3. Try asking: "What\'s the current Bitcoin price on Bitkub?"');

    console.log(
      "\n💡 Tip: If it doesn't work, check the Claude Desktop logs or try the manual setup in QUICK_START.md",
    );
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.log('\n🔧 Try manual setup instead:');
    console.log('1. Check QUICK_START.md for manual configuration steps');
    console.log('2. Ensure Claude Desktop is properly installed');
    console.log(`3. Your project path is: ${PROJECT_PATH}`);
    process.exit(1);
  }
}

main();
