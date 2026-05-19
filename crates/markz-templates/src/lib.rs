use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Template {
    pub id: String,
    pub name: String,
    pub category: String,
    pub description: String,
    pub content: String,
    pub builtin: bool,
}

#[derive(Debug, thiserror::Error)]
pub enum TemplateError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[error("Serialization error: {0}")]
    Serde(#[from] serde_json::Error),
    #[error("Template not found: {0}")]
    NotFound(String),
    #[error("Invalid template ID")]
    InvalidId,
}

/// Simple variable substitution for templates.
/// Supported variables: {{DATE}}, {{TIME}}, {{DATETIME}}, {{YEAR}}
pub fn substitute_variables(content: &str) -> String {
    let now = chrono::Local::now();
    let mut result = content.to_string();
    result = result.replace("{{DATE}}", &now.format("%Y-%m-%d").to_string());
    result = result.replace("{{TIME}}", &now.format("%H:%M").to_string());
    result = result.replace("{{DATETIME}}", &now.format("%Y-%m-%d %H:%M").to_string());
    result = result.replace("{{YEAR}}", &now.format("%Y").to_string());
    result
}

fn templates_dir() -> Option<std::path::PathBuf> {
    dirs::config_dir().map(|d| d.join("markz").join("templates"))
}

fn user_template_path(id: &str) -> Option<std::path::PathBuf> {
    templates_dir().map(|d| d.join(format!("{}.json", sanitize_id(id))))
}

fn sanitize_id(id: &str) -> String {
    id.chars()
        .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
        .collect()
}

/// List all templates (built-in + user-defined).
pub fn list_templates() -> Result<Vec<Template>, TemplateError> {
    let mut templates = builtin_templates();

    if let Some(dir) = templates_dir() {
        if dir.exists() {
            for entry in std::fs::read_dir(&dir)? {
                let entry = entry?;
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()) == Some("json") {
                    let data = std::fs::read_to_string(&path)?;
                    if let Ok(template) = serde_json::from_str::<Template>(&data) {
                        templates.push(template);
                    }
                }
            }
        }
    }

    // Sort by category then name
    templates.sort_by(|a, b| {
        a.category
            .cmp(&b.category)
            .then_with(|| a.name.cmp(&b.name))
    });

    Ok(templates)
}

/// Get a single template by ID (checks built-ins first, then user templates).
pub fn get_template(id: &str) -> Result<Option<Template>, TemplateError> {
    // Check built-ins first
    if let Some(t) = builtin_templates().into_iter().find(|t| t.id == id) {
        return Ok(Some(t));
    }

    // Check user templates
    if let Some(path) = user_template_path(id) {
        if path.exists() {
            let data = std::fs::read_to_string(&path)?;
            let template: Template = serde_json::from_str(&data)?;
            return Ok(Some(template));
        }
    }

    Ok(None)
}

/// Save a user-defined template.
pub fn save_template(template: &Template) -> Result<(), TemplateError> {
    if template.id.is_empty() {
        return Err(TemplateError::InvalidId);
    }

    let dir = templates_dir().ok_or_else(|| {
        TemplateError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Could not determine templates directory",
        ))
    })?;

    std::fs::create_dir_all(&dir)?;

    let path = user_template_path(&template.id).ok_or_else(|| {
        TemplateError::Io(std::io::Error::new(
            std::io::ErrorKind::NotFound,
            "Could not determine template file path",
        ))
    })?;

    let data = serde_json::to_string_pretty(template)?;
    std::fs::write(&path, data)?;

    Ok(())
}

/// Delete a user-defined template. Built-in templates cannot be deleted.
pub fn delete_template(id: &str) -> Result<(), TemplateError> {
    if let Some(path) = user_template_path(id) {
        if path.exists() {
            std::fs::remove_file(&path)?;
            return Ok(());
        }
    }
    Err(TemplateError::NotFound(id.to_string()))
}

fn builtin_templates() -> Vec<Template> {
    vec![
        Template {
            id: "bug-report".to_string(),
            name: "Bug Report".to_string(),
            category: "Engineering".to_string(),
            description: "Standard bug report for issue tracking".to_string(),
            builtin: true,
            content: BUG_REPORT.to_string(),
        },
        Template {
            id: "test-plan".to_string(),
            name: "Test Plan".to_string(),
            category: "Engineering".to_string(),
            description: "Structured test plan for features or releases".to_string(),
            builtin: true,
            content: TEST_PLAN.to_string(),
        },
        Template {
            id: "rfc".to_string(),
            name: "RFC".to_string(),
            category: "Engineering".to_string(),
            description: "Request for Comments — propose a new feature or change".to_string(),
            builtin: true,
            content: RFC.to_string(),
        },
        Template {
            id: "adr".to_string(),
            name: "ADR".to_string(),
            category: "Engineering".to_string(),
            description: "Architecture Decision Record".to_string(),
            builtin: true,
            content: ADR.to_string(),
        },
        Template {
            id: "design-doc".to_string(),
            name: "Design Doc".to_string(),
            category: "Engineering".to_string(),
            description: "High-level design document".to_string(),
            builtin: true,
            content: DESIGN_DOC.to_string(),
        },
        Template {
            id: "pr-description".to_string(),
            name: "PR Description".to_string(),
            category: "Engineering".to_string(),
            description: "Pull request description template".to_string(),
            builtin: true,
            content: PR_DESCRIPTION.to_string(),
        },
        Template {
            id: "meeting-notes".to_string(),
            name: "Meeting Notes".to_string(),
            category: "General".to_string(),
            description: "Notes for team meetings".to_string(),
            builtin: true,
            content: MEETING_NOTES.to_string(),
        },
        Template {
            id: "weekly-status".to_string(),
            name: "Weekly Status".to_string(),
            category: "General".to_string(),
            description: "Weekly status update for stakeholders".to_string(),
            builtin: true,
            content: WEEKLY_STATUS.to_string(),
        },
        Template {
            id: "formatting-test".to_string(),
            name: "Getting Started".to_string(),
            category: "Test".to_string(),
            description: "Welcome showcase and comprehensive formatting reference for MarkZ".to_string(),
            builtin: true,
            content: FORMATTING_TEST.to_string(),
        },
    ]
}

const BUG_REPORT: &str = r#"# Bug Report

## Summary
Brief description of the bug.

## Environment
- OS:
- Browser / App Version:
- Commit / Build:

## Steps to Reproduce
1.
2.
3.

## Expected Behavior
What should have happened.

## Actual Behavior
What actually happened.

## Screenshots / Logs
Add any relevant screenshots, error messages, or logs.

## Severity
- [ ] Critical — blocks main workflow
- [ ] High — major functionality impaired
- [ ] Medium — partial workaround exists
- [ ] Low — cosmetic or minor issue

## Assignee

## Due Date
"#;

const TEST_PLAN: &str = r#"# Test Plan: [Feature Name]

## Overview
What is being tested and why.

## Scope
### In Scope
-

### Out of Scope
-

## Test Strategy
### Unit Tests
-

### Integration Tests
-

### End-to-End Tests
-

### Manual Tests
-

## Test Data
Describe any special data requirements.

## Environment
- Staging:
- Production:

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
|      |        |            |

## Sign-off
- [ ] QA Lead
- [ ] Product Manager
- [ ] Engineering Lead
"#;

const RFC: &str = r#"# RFC: [Title]

## Metadata
- **Author:**
- **Date:** {{DATE}}
- **Status:** Draft
- **Target Reviewers:**

## Summary
One-paragraph summary of the proposal.

## Motivation
Why are we doing this? What problem does it solve?

## Goals
- Goal 1
- Goal 2

## Non-Goals
What is explicitly out of scope?

## Proposal
Detailed description of the proposed solution.

## Alternatives Considered
What other approaches were evaluated and why they were rejected.

## Risks
What could go wrong?

## Timeline
| Milestone | Date | Owner |
|-----------|------|-------|
|           |      |       |

## Open Questions
-
"#;

const ADR: &str = r#"# ADR-{{YEAR}}-XXX: [Short Title]

## Status
Proposed

## Context
What is the issue that we're seeing that is motivating this decision or change?

## Decision
What is the change that we're proposing or have agreed to implement?

## Consequences
What becomes easier or more difficult to do because of this change?

### Positive
-

### Negative
-

### Neutral
-

## Alternatives Considered
- Alternative A
- Alternative B

## References
-
"#;

const DESIGN_DOC: &str = r#"# Design Doc: [System / Feature]

## Overview
High-level description of what is being built.

## Goals
- Goal 1
- Goal 2

## Non-Goals
What is NOT included in this design.

## Architecture
### System Diagram
```
[Diagram placeholder]
```

### Data Model
```
[Schema / entity definitions]
```

### API Design
```
[Endpoints, request/response shapes]
```

## Implementation Plan
### Phase 1
-

### Phase 2
-

## Testing Strategy
-

## Rollout Plan
-

## Monitoring & Alerting
-

## Open Questions
-
"#;

const PR_DESCRIPTION: &str = r#"## Summary
One-line summary of the change.

## Changes
- Change 1
- Change 2

## Motivation
Why this change is needed.

## Testing
How was this tested?

## Screenshots / Videos
[If applicable]

## Checklist
- [ ] Code follows style guidelines
- [ ] Tests added / updated
- [ ] Documentation updated
- [ ] Changelog entry added
"#;

const MEETING_NOTES: &str = r#"# Meeting Notes — {{DATE}}

## Attendees
-

## Agenda
1.
2.
3.

## Discussion
### Topic 1
Notes...

### Topic 2
Notes...

## Action Items
| Task | Owner | Due |
|------|-------|-----|
|      |       |     |

## Decisions
-

## Next Meeting
- Date:
- Agenda items:
"#;

const WEEKLY_STATUS: &str = r#"# Weekly Status — {{DATE}}

## Accomplishments This Week
-

## In Progress
| Item | Status | Blockers |
|------|--------|----------|
|      |        |          |

## Upcoming Week
-

## Blockers / Risks
-

## Notes
-
"#;

const FORMATTING_TEST: &str = r#"# Welcome to MarkZ

> **The engineer's Markdown editor.** Built for speed, designed for clarity, and optimized for the tools you already use.

MarkZ is a dual-pane Markdown editor that helps you write, preview, and export engineering documents without friction. Whether you're drafting RFCs, documenting APIs, or preparing content for JIRA and Confluence, MarkZ keeps you in flow.

---

## What Makes MarkZ Different

| Feature | Description |
|---------|-------------|
| **Live Preview** | See your document render instantly as you type |
| **Export Pipeline** | One-click export to JIRA, Confluence, Slack, GitHub, and DOCX |
| **Image Handling** | Paste from clipboard or drag-and-drop — images are organized automatically |
| **Syntax Highlighting** | 30+ languages with tree-sitter accuracy |
| **Math & Diagrams** | KaTeX for equations, Mermaid for flowcharts |
| **Templates** | Built-in RFC, ADR, Bug Report, and more |

---

## Quick Start

### 1. Write Markdown
MarkZ supports standard CommonMark plus extensions:

**Formatting:** *italic*, **bold**, `inline code`, ~~strikethrough~~

**Lists:**
- Unordered items
- [x] Completed tasks
- [ ] Pending tasks

**Code blocks** with syntax highlighting:
```rust
fn main() {
    println!("Hello, MarkZ!");
}
```

### 2. Preview Your Work
The right pane renders your document in real time. Toggle between **HTML**, **JIRA**, **Confluence**, **Slack**, and **GitHub** preview modes to see exactly how your content will look in each platform.

### 3. Export Cleanly
MarkZ exports **only what you write** — no watermarks, no "created with" banners, no unwanted metadata. Your content stays yours.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl + S` | Save document |
| `Ctrl + O` | Open file |
| `Ctrl + T` | New tab |
| `Ctrl + W` | Close tab |
| `Ctrl + B` | Toggle outline sidebar |
| `Ctrl + =` | Zoom in |
| `Ctrl + -` | Zoom out |
| `Ctrl + 0` | Reset zoom |

---

## Formatting Reference

This section exercises every formatting feature MarkZ supports.

### Headings
# Heading 1
## Heading 2
### Heading 3
#### Heading 4
##### Heading 5
###### Heading 6

### Inline Formatting
Normal text, **bold text**, *italic text*, ~~strikethrough~~, and `inline code`.

Combined: ***bold italic***, **`bold code`**, *`italic code`*.

[External link to example.com](https://example.com)

### Code Blocks

#### Rust
```rust
fn main() {
    let message = "Hello, MarkZ!";
    println!("{}", message);
}
```

#### Python
```python
def fibonacci(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b

print(list(fibonacci(10)))
```

#### JSON
```json
{
  "name": "MarkZ",
  "version": "0.1.0",
  "features": ["preview", "export", "templates"]
}
```

### Blockquotes
> Single-level blockquote with **bold** and `code`.

> Multi-paragraph blockquote.
>
> Second paragraph with a [link](https://example.com).

> > Nested blockquote level 2
> >
> > > Nested blockquote level 3

### Lists

#### Unordered
- First item
- Second item
  - Nested item A
  - Nested item B
    - Deep nested item
- Third item

#### Ordered
1. First step
2. Second step
   1. Sub-step A
   2. Sub-step B
3. Third step

#### Task List
- [x] Completed task
- [ ] Pending task
- [ ] Another pending task
  - [x] Sub-task done
  - [ ] Sub-task waiting

#### Mixed
1. Ordered first
   - Unordered nested
   - Another nested
2. Ordered second
   1. Ordered nested
   2. Another nested

### Tables

#### Simple Table
| Feature | Status | Notes |
|---------|--------|-------|
| Headings | ✅ | All 6 levels |
| Bold/Italic | ✅ | Combined styles |
| Code Blocks | ✅ | Syntax highlighting |
| Tables | ✅ | This one! |
| Images | ✅ | Local & remote |

#### Alignment Table
| Left | Center | Right |
|:-----|:------:|------:|
| L1   | C1     | R1    |
| L2   | C2     | R2    |
| L3   | C3     | R3    |

### Horizontal Rules
Above rule.

---

Below rule with **bold** text.

***

Another rule.

### Special Characters & Escapes
- Asterisk: \*not italic\*
- Hash: \# not heading
- Backtick: \`not code\`
- Ampersand: AT&T
- Less/Greater: 5 < 10 > 2
- Emoji: 🚀 ✅ ❌ 💡

---

## Math

Inline math: $E = mc^2$ and $\vec{F} = m\vec{a}$

Block math:
$$
\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}
$$

Matrix:
$$
\begin{bmatrix}
a & b \\
c & d
\end{bmatrix}^{-1}
=
\frac{1}{ad-bc}
\begin{bmatrix}
d & -b \\
-c & a
\end{bmatrix}
$$

---

## Mermaid Diagram

```mermaid
graph TD
    A[Markdown Editor] --> B[Parser]
    B --> C[AST]
    C --> D[HTML Renderer]
    C --> E[DOCX Converter]
    C --> F[JIRA Converter]
    D --> G[Preview Pane]
    E --> H[File Export]
    F --> I[Clipboard]
```

---

## HTML Details (if supported)

<details>
<summary>Click to expand</summary>

Hidden content inside a details block.

</details>

---

*Welcome to MarkZ — {{DATETIME}}*
"#;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_builtin_templates_exist() {
        let templates = builtin_templates();
        assert!(!templates.is_empty());
        assert!(templates.iter().all(|t| t.builtin));
    }

    #[test]
    fn test_substitute_variables() {
        let result = substitute_variables("Date: {{DATE}}, Year: {{YEAR}}");
        assert!(result.contains("Date: "));
        assert!(result.contains("Year: "));
        assert!(!result.contains("{{DATE}}"));
        assert!(!result.contains("{{YEAR}}"));
    }

    #[test]
    fn test_list_templates() {
        let templates = list_templates().unwrap();
        assert!(!templates.is_empty());
        // Built-ins should be present
        assert!(templates.iter().any(|t| t.id == "bug-report"));
    }

    #[test]
    fn test_get_builtin_template() {
        let template = get_template("bug-report").unwrap();
        assert!(template.is_some());
        let t = template.unwrap();
        assert_eq!(t.id, "bug-report");
        assert!(t.builtin);
        assert!(!t.content.is_empty());
    }

    #[test]
    fn test_save_and_delete_user_template() {
        let template = Template {
            id: "test-user-template".to_string(),
            name: "Test".to_string(),
            category: "Test".to_string(),
            description: "A test template".to_string(),
            content: "# Hello".to_string(),
            builtin: false,
        };

        save_template(&template).unwrap();

        let retrieved = get_template("test-user-template").unwrap();
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap().name, "Test");

        // Cleanup
        delete_template("test-user-template").unwrap();
        assert!(get_template("test-user-template").unwrap().is_none());
    }
}
