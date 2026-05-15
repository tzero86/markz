pub mod ast;
pub mod parser;
pub mod html;
pub mod frontmatter;
pub mod toc;

pub use toc::{generate_toc, slugify};
