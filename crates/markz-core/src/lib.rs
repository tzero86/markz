pub mod ast;
pub mod parser;
pub mod html;
pub mod frontmatter;
pub mod toc;
pub mod html_to_markdown;
pub mod e2e_render_tests;
pub mod stats;
pub mod slides;
pub mod util;

pub use toc::{generate_toc, slugify};