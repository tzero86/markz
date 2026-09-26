//! DOCX export.
//!
//! The implementation lives in [`docx_impl`] and is compiled only when the
//! `docx` feature is enabled. When it is off, [`convert`] still exists and
//! returns [`ConvertDocxError::FeatureDisabled`] so callers get a clear error
//! instead of a missing symbol.

#[cfg(feature = "docx")]
#[path = "docx_impl.rs"]
mod docx_impl;

#[cfg(feature = "docx")]
pub use docx_impl::convert;

#[derive(Debug, thiserror::Error)]
pub enum ConvertDocxError {
    #[cfg(feature = "docx")]
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),
    #[cfg(feature = "docx")]
    #[error("DOCX error: {0}")]
    Docx(#[from] docx_rs::DocxError),
    #[error("{0}")]
    Other(String),
    /// Only declared when it can actually be produced, so a default build
    /// carrying the `docx` feature has no unconstructible variant.
    #[cfg(not(feature = "docx"))]
    #[error("DOCX export is unavailable: this build was compiled without the `docx` feature")]
    FeatureDisabled,
}

#[cfg(not(feature = "docx"))]
mod feature_off {
    use markz_core::ast::Document;

    use crate::context::ConvertContext;
    use crate::docx::ConvertDocxError;

    /// Always fails: the `docx` feature is not compiled into this build.
    pub fn convert(
        _document: &Document,
        _ctx: &ConvertContext,
    ) -> Result<(Vec<u8>, Vec<String>), ConvertDocxError> {
        Err(ConvertDocxError::FeatureDisabled)
    }
}

#[cfg(not(feature = "docx"))]
pub use feature_off::convert;
