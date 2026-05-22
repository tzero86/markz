pub mod ast;
pub mod parser;
pub mod html;
pub mod frontmatter;
pub mod toc;
pub mod html_to_markdown;

pub use toc::{generate_toc, slugify};
