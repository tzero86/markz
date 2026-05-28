use serde::{Deserialize, Serialize};

/// The root document AST.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Document {
    pub frontmatter: Option<Frontmatter>,
    pub blocks: Vec<Block>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct Frontmatter {
    pub raw: String,
    pub format: FrontmatterFormat,
    pub metadata: serde_json::Value,
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum FrontmatterFormat {
    Yaml,
    Toml,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Block {
    Heading {
        level: u8,
        text: Vec<Inline>,
    },
    Paragraph {
        text: Vec<Inline>,
    },
    CodeBlock {
        language: Option<String>,
        content: String,
    },
    BlockQuote {
        blocks: Vec<Block>,
    },
    List {
        ordered: bool,
        start: Option<u64>,
        items: Vec<ListItem>,
    },
    Table {
        header: Vec<TableCell>,
        rows: Vec<Vec<TableCell>>,
    },
    FootnoteDefinition {
        label: String,
        blocks: Vec<Block>,
    },
    ThematicBreak,
    RawHtml(String),
}
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ListItem {
    pub blocks: Vec<Block>,
    pub task: Option<bool>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct TableCell {
    pub text: Vec<Inline>,
    pub alignment: Option<Alignment>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Alignment {
    Left,
    Center,
    Right,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub enum Inline {
    Text(String),
    Code(String),
    Emphasis(Vec<Inline>),
    Strong(Vec<Inline>),
    Strikethrough(Vec<Inline>),
    Link {
        text: Vec<Inline>,
        url: String,
        title: Option<String>,
    },
    Image {
        alt: String,
        url: String,
        title: Option<String>,
    },
    FootnoteReference {
        label: String,
    },
    HardBreak,
    SoftBreak,
    Html(String),
    WikiLink {
        target: String,
        display: String,
    },
}

impl Document {
    pub fn new() -> Self {
        Self {
            frontmatter: None,
            blocks: Vec::new(),
        }
    }
}

impl Default for Document {
    fn default() -> Self {
        Self::new()
    }
}
