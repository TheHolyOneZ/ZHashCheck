// Copyright (c) 2026 TheHolyOneZ

use serde::Serialize;
use thiserror::Error;
use ts_rs::TS;

#[derive(Debug, Error)]
pub enum CoreError {
    #[error("I/O error: {0}")]
    Io(#[from] std::io::Error),
    #[error("invalid hex: {0}")]
    Hex(#[from] hex::FromHexError),
    #[error("unknown algorithm: {0}")]
    UnknownAlgo(String),
    #[error("invalid checksum file: {0}")]
    InvalidChecksumFile(String),
    #[error("cancelled")]
    Cancelled,
    #[error("job not found: {0}")]
    JobNotFound(String),
    #[error("{0}")]
    Msg(String),
}

impl CoreError {
    pub fn msg(s: impl Into<String>) -> Self {
        Self::Msg(s.into())
    }
}


#[derive(Debug, Serialize, TS)]
#[ts(export, export_to = "../../src/bindings/")]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub kind: String,
    pub message: String,
}

impl From<CoreError> for AppError {
    fn from(e: CoreError) -> Self {
        let kind = match &e {
            CoreError::Io(_) => "io",
            CoreError::Hex(_) => "hex",
            CoreError::UnknownAlgo(_) => "unknownAlgo",
            CoreError::InvalidChecksumFile(_) => "invalidChecksumFile",
            CoreError::Cancelled => "cancelled",
            CoreError::JobNotFound(_) => "jobNotFound",
            CoreError::Msg(_) => "error",
        };
        AppError {
            kind: kind.into(),
            message: e.to_string(),
        }
    }
}

impl From<anyhow::Error> for AppError {
    fn from(e: anyhow::Error) -> Self {
        AppError {
            kind: "error".into(),
            message: e.to_string(),
        }
    }
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        CoreError::Io(e).into()
    }
}

pub type CoreResult<T> = std::result::Result<T, CoreError>;
pub type CmdResult<T> = std::result::Result<T, AppError>;
