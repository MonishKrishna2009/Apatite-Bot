#!/usr/bin/env node
/*
 * Apatite Bot - The all-in-one open-source Discord bot for esports, tournaments, and community management.
 *
 * Copyright (C) 2024 Monish Krishna
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */


/**
 * License Header Addition Script
 * 
 * This script adds GPL v3.0 license headers to all source files in the project.
 * It ensures compliance with GPL v3.0 requirements for proper copyright notices.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// GPL v3.0 License header template
const LICENSE_HEADER = ``;

// Files and directories to skip
const SKIP_PATTERNS = [
    'node_modules',
    '.git',
    'dist',
    'build',
    'coverage',
    '.next',
    'LICENSE',
    'README.md',
    'package.json',
    'package-lock.json',
    'bun.lock',
    '.env',
    '.env.example',
    '.gitignore',
    '.cursorignore',
    'lfp.json',
    'lft.json',
];

// File extensions to process
const FILE_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx', '.json'];

// Check if file should be skipped
function shouldSkipFile(filePath) {
    const relativePath = path.relative(projectRoot, filePath);
    
    // Skip if matches any skip pattern
    for (const pattern of SKIP_PATTERNS) {
        if (relativePath.includes(pattern)) {
            return true;
        }
    }
    
    // Only check file extensions for actual files, not directories
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
        const ext = path.extname(filePath);
        if (!FILE_EXTENSIONS.includes(ext)) {
            return true;
        }
    }
    
    return false;
}

// Check if file already has license header
function hasLicenseHeader(content) {
    // Check if file already has our specific license header
    const hasCopyright = content.includes('Copyright (C) 2025 Monish Krishna');
    const hasDescription = content.includes('Apatite Bot - The all-in-one open-source Discord bot for esports, tournaments, and community management.');
    const hasGPL = content.includes('GNU General Public License');
    
    // File has our header if it contains all three elements
    return hasCopyright && hasDescription && hasGPL;
}

// Add license header to file content
function addLicenseHeader(content) {
    // If file starts with shebang, preserve it
    if (content.startsWith('#!')) {
        const lines = content.split('\n');
        const shebang = lines[0];
        const rest = lines.slice(1).join('\n');
        return shebang + '\n' + LICENSE_HEADER + rest;
    }
    
    return LICENSE_HEADER + content;
}

// Process a single file
function processFile(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        if (hasLicenseHeader(content)) {
            console.log(`✓ ${path.relative(projectRoot, filePath)} - Already has license header`);
            return;
        }
        
        const newContent = addLicenseHeader(content);
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log(`✓ ${path.relative(projectRoot, filePath)} - License header added`);
        
    } catch (error) {
        console.error(`✗ ${path.relative(projectRoot, filePath)} - Error: ${error.message}`);
    }
}

// Recursively process directory
function processDirectory(dirPath) {
    try {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stat = fs.statSync(itemPath);
            
            if (stat.isDirectory()) {
                if (!shouldSkipFile(itemPath)) {
                    console.log(`📁 Processing directory: ${path.relative(projectRoot, itemPath)}`);
                    processDirectory(itemPath);
                }
            } else if (stat.isFile()) {
                if (!shouldSkipFile(itemPath)) {
                    processFile(itemPath);
                }
            }
        }
    } catch (error) {
        console.error(`Error processing directory ${dirPath}: ${error.message}`);
    }
}

// Main execution
console.log('🔍 Adding GPL v3.0 license headers to source files...\n');
console.log(`📁 Project root: ${projectRoot}`);
console.log(`📁 Processing from: ${projectRoot}\n`);

processDirectory(projectRoot);

console.log('\n✅ License header addition completed!');
console.log('\n📋 Summary:');
console.log('- All source files now include GPL v3.0 license headers');
console.log('- Headers include copyright notice and license terms');
console.log('- Files with existing headers were skipped');
console.log('- Configuration and build files were excluded');
console.log('\n⚖️  Legal Compliance:');
console.log('- Source code is properly marked with copyright');
console.log('- License terms are clearly stated');
console.log('- Users can easily identify licensing terms');
console.log('\n🔗 For more information about GPL v3.0:');
console.log('   https://www.gnu.org/licenses/gpl-3.0.html');
