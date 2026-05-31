// Copyright (c) 2026 TheHolyOneZ


mod algos;
mod stream;

pub use algos::{Algo, MultiDigest};
pub use stream::{hash_path, HashOptions, ProgressCb, HASH_CHUNK};

use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use ts_rs::TS;


#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/bindings/")]
#[serde(rename_all = "camelCase")]
pub struct FileHashes {

    pub hashes: BTreeMap<Algo, String>,
    pub bytes: u64,
    pub took_ms: u64,
}
