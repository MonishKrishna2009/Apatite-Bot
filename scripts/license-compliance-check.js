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
 * License Compliance Enforcement Script
 * 
 * This script checks for GPL v3.0 license compliance across the project.
 * It verifies that all source files have proper license headers and
 * that the project meets GPL v3.0 requirements.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

// Compliance check results
const results = {
    passed: 0,
    failed: 0,
    warnings: 0,
    issues: []
};

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
    'scripts',
    'lfp.json',
    'lft.json',
    '.bun',
    '.github',
    'GitAssets',
    'assets',
    'docs'

];

// File extensions to check
const FILE_EXTENSIONS = ['.js', '.ts', '.jsx', '.tsx'];

// Required license elements
const REQUIRED_ELEMENTS = [
    'Copyright (C) 2025 Monish Krishna',
    'GNU General Public License',
    'Free Software Foundation',
    'GNU General Public License for more details',
    'https://www.gnu.org/licenses/'
];

// Check if file should be skipped
function shouldSkipFile(filePath) {
    const relativePath = path.relative(projectRoot, filePath);
    
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

// Check license header compliance
function checkLicenseCompliance(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        const relativePath = path.relative(projectRoot, filePath);
        
        // Check if file has any license header
        if (!content.includes('Copyright') && !content.includes('License')) {
            results.failed++;
            results.issues.push({
                type: 'error',
                file: relativePath,
                message: 'No license header found'
            });
            return false;
        }
        
        // Check for required elements
        let missingElements = [];
        for (const element of REQUIRED_ELEMENTS) {
            if (!content.includes(element)) {
                missingElements.push(element);
            }
        }
        
        if (missingElements.length > 0) {
            results.warnings++;
            results.issues.push({
                type: 'warning',
                file: relativePath,
                message: `Missing required elements: ${missingElements.join(', ')}`
            });
            return false;
        }
        
        results.passed++;
        return true;
        
    } catch (error) {
        results.failed++;
        results.issues.push({
            type: 'error',
            file: path.relative(projectRoot, filePath),
            message: `Error reading file: ${error.message}`
        });
        return false;
    }
}

// Check package.json compliance
function checkPackageJson() {
    try {
        const packagePath = path.join(projectRoot, 'package.json');
        const content = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
        
        if (!content.license || !content.license.includes('GPL')) {
            results.failed++;
            results.issues.push({
                type: 'error',
                file: 'package.json',
                message: 'License field missing or not GPL-compatible'
            });
            return false;
        }
        
        if (!content.author) {
            results.warnings++;
            results.issues.push({
                type: 'warning',
                file: 'package.json',
                message: 'Author field missing'
            });
        }
        
        results.passed++;
        return true;
        
    } catch (error) {
        results.failed++;
        results.issues.push({
            type: 'error',
            file: 'package.json',
            message: `Error reading package.json: ${error.message}`
        });
        return false;
    }
}

// Check LICENSE file
function checkLicenseFile() {
    try {
        const licensePath = path.join(projectRoot, 'LICENSE');
        
        if (!fs.existsSync(licensePath)) {
            results.failed++;
            results.issues.push({
                type: 'error',
                file: 'LICENSE',
                message: 'LICENSE file not found'
            });
            return false;
        }
        
        const content = fs.readFileSync(licensePath, 'utf8');
        
        if (!content.includes('GNU GENERAL PUBLIC LICENSE') || 
            !content.includes('Version 3')) {
            results.failed++;
            results.issues.push({
                type: 'error',
                file: 'LICENSE',
                message: 'LICENSE file does not contain GPL v3.0 text'
            });
            return false;
        }
        
        results.passed++;
        return true;
        
    } catch (error) {
        results.failed++;
        results.issues.push({
            type: 'error',
            file: 'LICENSE',
            message: `Error reading LICENSE file: ${error.message}`
        });
        return false;
    }
}

// Recursively check directory
function checkDirectory(dirPath) {
    try {
        const items = fs.readdirSync(dirPath);
        
        for (const item of items) {
            const itemPath = path.join(dirPath, item);
            const stat = fs.statSync(itemPath);
            
            if (stat.isDirectory()) {
                if (!shouldSkipFile(itemPath)) {
                    checkDirectory(itemPath);
                }
            } else if (stat.isFile()) {
                if (!shouldSkipFile(itemPath)) {
                    checkLicenseCompliance(itemPath);
                }
            }
        }
    } catch (error) {
        console.error(`Error checking directory ${dirPath}: ${error.message}`);
    }
}

// Generate compliance report
function generateReport() {
    const total = results.passed + results.failed + results.warnings;
    const passRate = total > 0 ? ((results.passed / total) * 100).toFixed(1) : 0;
    
    console.log('\n📊 LICENSE COMPLIANCE REPORT');
    console.log('='.repeat(50));
    console.log(`✅ Passed: ${results.passed}`);
    console.log(`❌ Failed: ${results.failed}`);
    console.log(`⚠️  Warnings: ${results.warnings}`);
    console.log(`📈 Pass Rate: ${passRate}%`);
    console.log(`📁 Total Files Checked: ${total}`);
    
    if (results.issues.length > 0) {
        console.log('\n🔍 ISSUES FOUND:');
        console.log('-'.repeat(30));
        
        results.issues.forEach((issue, index) => {
            const icon = issue.type === 'error' ? '❌' : '⚠️';
            console.log(`${icon} ${index + 1}. ${issue.file}`);
            console.log(`   ${issue.message}`);
            console.log('');
        });
    }
    
    console.log('\n📋 COMPLIANCE CHECKLIST:');
    console.log('-'.repeat(30));
    console.log('✓ LICENSE file present and contains GPL v3.0 text');
    console.log('✓ package.json has correct license field');
    console.log('✓ Source files have license headers');
    console.log('✓ Copyright notices are present');
    console.log('✓ License terms are clearly stated');
    
    console.log('\n⚖️  GPL v3.0 REQUIREMENTS:');
    console.log('-'.repeat(30));
    console.log('• Source code must be available');
    console.log('• License terms must be clearly stated');
    console.log('• Copyright notices must be preserved');
    console.log('• Modified versions must be marked');
    console.log('• No additional restrictions allowed');
    
    return results.failed === 0;
}

// Main execution
console.log('🔍 Checking GPL v3.0 license compliance...\n');

// Check core files
checkLicenseFile();
checkPackageJson();

// Check source files
checkDirectory(projectRoot);

// Generate report
const isCompliant = generateReport();

if (isCompliant) {
    console.log('\n🎉 LICENSE COMPLIANCE: PASSED');
    console.log('Your project meets GPL v3.0 requirements!');
    process.exit(0);
} else {
    console.log('\n❌ LICENSE COMPLIANCE: FAILED');
    console.log('Please fix the issues above to ensure GPL v3.0 compliance.');
    process.exit(1);
}
