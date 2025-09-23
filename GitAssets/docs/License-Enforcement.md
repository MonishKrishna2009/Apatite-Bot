# License Enforcement Guide

This document explains how to maintain GPL v3.0 license compliance in the Apatite Bot project.

## 🔍 License Compliance Tools

### 1. License Header Addition Script
```bash
bun run add-license-headers
# or
bun run scripts/add-license-headers.js
```

**Purpose**: Adds GPL v3.0 license headers to all source files.

**When to use**:
- After adding new source files
- When updating license information
- During project setup

### 2. License Compliance Check Script
```bash
bun run check-license-compliance
# or
bun run scripts/license-compliance-check.js
```

**Purpose**: Verifies that the project meets GPL v3.0 requirements.

**When to use**:
- Before committing changes
- During CI/CD pipeline
- Weekly compliance audits

## 📋 Compliance Checklist

### ✅ Required Elements

1. **LICENSE File**
   - Must contain complete GPL v3.0 text
   - Must be in project root directory
   - Must be named `LICENSE` (no extension)

2. **package.json**
   - Must specify `"license": "GPL-3.0-or-later"`
   - Must include author information
   - Must include repository URL

3. **Source Files**
   - Must contain copyright notice: `Copyright (C) 2025 Monk` or later year's
   - Must reference GPL v3.0 license
   - Must include license text or reference to LICENSE file

4. **Documentation**
   - README must mention GPL v3.0 license
   - Must explain license terms clearly
   - Must provide links to license resources

## 🔧 Automated Enforcement

### GitHub Actions Workflow
The project includes a GitHub Actions workflow (`.github/workflows/license-compliance.yml`) that:

- Runs on every push and pull request
- Runs weekly on Sundays at 2 AM UTC
- Checks LICENSE file compliance
- Verifies package.json license field
- Validates source file headers
- Generates compliance reports

### Pre-commit Hooks (Recommended)
Add to your development workflow:

```bash
# Add to .git/hooks/pre-commit
#!/bin/bash
bun run check-license-compliance
if [ $? -ne 0 ]; then
  echo "❌ License compliance check failed"
  exit 1
fi
```

## ⚖️ Legal Requirements

### GPL v3.0 Key Requirements

1. **Source Code Availability**
   - Source code must be available to all users
   - Must be in a form suitable for modification

2. **License Preservation**
   - License terms must be preserved in all copies
   - Copyright notices must be maintained

3. **Copyleft**
   - Derivative works must also be GPL v3.0 licensed
   - No additional restrictions allowed

4. **Attribution**
   - Original copyright notices must be preserved
   - Author attribution must be maintained

## 🚨 Common Violations

### ❌ What NOT to do:

1. **Remove license headers** from source files
2. **Add proprietary restrictions** to the license
3. **Distribute without source code** (for binary distributions)
4. **Use incompatible licenses** for derivative works
5. **Fail to attribute** original authors

### ✅ What TO do:

1. **Preserve all license notices** in source files
2. **Include LICENSE file** with all distributions
3. **Provide source code** for any binary distributions
4. **Use GPL v3.0** for derivative works
5. **Maintain attribution** to original authors

## 🔗 Resources

- [GPL v3.0 License Text](https://www.gnu.org/licenses/gpl-3.0.html)
- [GPL v3.0 FAQ](https://www.gnu.org/licenses/gpl-faq.html)
- [Free Software Foundation](https://www.fsf.org/)
- [GPL v3.0 Compliance Guide](https://www.gnu.org/licenses/gpl-compliance.html)

## 📞 Support

If you have questions about license compliance:

1. Check the compliance script output
2. Review the GPL v3.0 FAQ
3. Consult with legal counsel for complex cases
4. Contact the Free Software Foundation

---

**Remember**: GPL v3.0 compliance is not optional. It's a legal requirement that protects the freedom of users and ensures the software remains free and open.
