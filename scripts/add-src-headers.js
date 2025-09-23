#!/usr/bin/env node
/**
 * Targeted License Header Addition Script for src/ directory
 * 
 * This script adds GPL v3.0 license headers to all source files in the src/ directory.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const srcDir = path.join(projectRoot, 'src');

// GPL v3.0 License header template
const LICENSE_HEADER = `/*
 * Apatite Bot - The all-in-one open-source Discord bot for esports, tournaments, and community management.
 *
 * Copyright (C) 2025 Monish Krishna
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

`;

// File extensions to process
const FILE_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx'];

// Check if file already has license header
function hasLicenseHeader(content) {
    // Check if file already has our specific license header (2025 version)
    const hasCopyright2025 = content.includes('Copyright (C) 2025 Monish Krishna');
    const hasDescription = content.includes('Apatite Bot - The all-in-one open-source Discord bot for esports, tournaments, and community management.');
    const hasGPL = content.includes('GNU General Public License');
    
    // File has our header if it contains all three elements
    return hasCopyright2025 && hasDescription && hasGPL;
}

// Check for duplicate headers
function hasDuplicateHeaders(content) {
    const copyrightMatches = content.match(/Copyright \(C\) 20\d{2} Monish Krishna/g);
    return copyrightMatches && copyrightMatches.length > 1;
}

// Remove duplicate headers
function removeDuplicateHeaders(content) {
    // Pattern to match license headers (both 2024 and 2025 versions)
    const LICENSE_HEADER_PATTERN = /\/\*\s*\n\s*\*\s*Apatite Bot - The all-in-one open-source Discord bot for esports, tournaments, and community management\.\s*\n\s*\*\s*\n\s*\*\s*Copyright \(C\) 20\d{2} Monish Krishna\s*\n\s*\*\s*\n\s*\*\s*This program is free software: you can redistribute it and\/or modify\s*\n\s*\*\s*it under the terms of the GNU General Public License as published by\s*\n\s*\*\s*the Free Software Foundation, either version 3 of the License, or\s*\n\s*\*\s*\(at your option\) any later version\.\s*\n\s*\*\s*\n\s*\*\s*This program is distributed in the hope that it will be useful,\s*\n\s*\*\s*but WITHOUT ANY WARRANTY; without even the implied warranty of\s*\n\s*\*\s*MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE\.  See the\s*\n\s*\*\s*GNU General Public License for more details\.\s*\n\s*\*\s*\n\s*\*\s*You should have received a copy of the GNU General Public License\s*\n\s*\*\s*along with this program\.  If not, see <https:\/\/www\.gnu\.org\/licenses\/>\.\s*\n\s*\*\/\s*\n/g;
    
    const matches = content.match(LICENSE_HEADER_PATTERN);
    if (!matches || matches.length <= 1) {
        return content; // No duplicates
    }
    
    // Remove all but the first header
    let result = content;
    for (let i = 1; i < matches.length; i++) {
        result = result.replace(matches[i], '');
    }
    
    return result;
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

// Check if file should be processed
function shouldProcessFile(filePath) {
    const ext = path.extname(filePath);
    return FILE_EXTENSIONS.includes(ext);
}

// Process a single file
function processFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        // Check for duplicate headers first
        if (hasDuplicateHeaders(content)) {
            content = removeDuplicateHeaders(content);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✓ ${path.relative(projectRoot, filePath)} - Duplicate headers removed`);
        }
        
        // Check if file already has our license header (2025 version)
        if (hasLicenseHeader(content)) {
            console.log(`✓ ${path.relative(projectRoot, filePath)} - Already has correct license header`);
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
                processDirectory(itemPath);
            } else if (stat.isFile()) {
                if (shouldProcessFile(itemPath)) {
                    processFile(itemPath);
                }
            }
        }
    } catch (error) {
        console.error(`Error processing directory ${dirPath}: ${error.message}`);
    }
}

// Main execution
console.log('🔍 Adding GPL v3.0 license headers to src/ directory...\n');

if (!fs.existsSync(srcDir)) {
    console.error('❌ src/ directory not found!');
    process.exit(1);
}

processDirectory(srcDir);

console.log('\n✅ License header addition completed!');
console.log('\n📋 Summary:');
console.log('- All source files in src/ now include GPL v3.0 license headers');
console.log('- Headers include copyright notice and license terms');
console.log('- Files with existing headers were updated');
console.log('\n⚖️  Legal Compliance:');
console.log('- Source code is properly marked with copyright');
console.log('- License terms are clearly stated');
console.log('- Users can easily identify licensing terms');
console.log('\n🔗 For more information about GPL v3.0:');
console.log('   https://www.gnu.org/licenses/gpl-3.0.html');
