// Copyright (c) 2026 TheHolyOneZ


use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;

const HEAD_TAIL: u64 = 64 * 1024;

pub fn prefilter_hash(path: &Path, size: u64) -> std::io::Result<u64> {
    let mut f = File::open(path)?;
    let mut hasher = xxhash_rust::xxh3::Xxh3::new();

    if size <= 2 * HEAD_TAIL {

        let mut buf = Vec::with_capacity(size as usize);
        f.read_to_end(&mut buf)?;
        hasher.update(&buf);
        return Ok(hasher.digest());
    }

    let mut head = vec![0u8; HEAD_TAIL as usize];
    f.read_exact(&mut head)?;
    hasher.update(&head);

    let mut tail = vec![0u8; HEAD_TAIL as usize];
    f.seek(SeekFrom::End(-(HEAD_TAIL as i64)))?;
    f.read_exact(&mut tail)?;
    hasher.update(&tail);

    Ok(hasher.digest())
}
