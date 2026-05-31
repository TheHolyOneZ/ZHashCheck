// Copyright (c) 2026 TheHolyOneZ


use std::fs::File;
use std::io::{BufReader, Read};
use std::path::Path;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;

use super::algos::{Algo, MultiDigest};
use super::FileHashes;
use crate::error::{CoreError, CoreResult};


pub const HASH_CHUNK: usize = 1 << 20;

const LARGE_FILE_THRESHOLD: u64 = 256 << 20;

const MMAP_THRESHOLD: u64 = 1 << 30;

pub type ProgressCb = Box<dyn FnMut(u64) + Send>;

#[derive(Clone)]
pub struct HashOptions {
    pub algos: Vec<Algo>,
    pub cancel: Arc<AtomicBool>,

    pub allow_mmap: bool,
}

impl Default for HashOptions {
    fn default() -> Self {
        Self {
            algos: vec![Algo::Sha256, Algo::Blake3],
            cancel: Arc::new(AtomicBool::new(false)),
            allow_mmap: true,
        }
    }
}


pub fn hash_path(
    path: &Path,
    opts: &HashOptions,
    mut progress: Option<ProgressCb>,
) -> CoreResult<FileHashes> {
    let started = Instant::now();
    let meta = std::fs::metadata(path)?;
    let total = meta.len();

    let mut md = MultiDigest::new(&opts.algos);
    let mut bytes_read: u64 = 0;


    if opts.allow_mmap && total >= MMAP_THRESHOLD {
        if let Ok(file) = File::open(path) {
            if let Ok(map) = unsafe { memmap2::Mmap::map(&file) } {
                let chunk = if total >= LARGE_FILE_THRESHOLD {
                    4 << 20
                } else {
                    HASH_CHUNK
                };
                for slice in map.chunks(chunk) {
                    if opts.cancel.load(Ordering::Relaxed) {
                        return Err(CoreError::Cancelled);
                    }
                    md.update(slice);
                    bytes_read += slice.len() as u64;
                    if let Some(cb) = progress.as_mut() {
                        cb(bytes_read);
                    }
                }
                return Ok(finalize(md, bytes_read, started));
            }
        }

    }


    let chunk = if total >= LARGE_FILE_THRESHOLD {
        4 << 20
    } else {
        HASH_CHUNK
    };
    let mut reader = BufReader::with_capacity(chunk, File::open(path)?);
    let mut buf = vec![0u8; chunk];

    loop {
        if opts.cancel.load(Ordering::Relaxed) {
            return Err(CoreError::Cancelled);
        }
        let n = reader.read(&mut buf)?;
        if n == 0 {
            break;
        }
        md.update(&buf[..n]);
        bytes_read += n as u64;
        if let Some(cb) = progress.as_mut() {
            cb(bytes_read);
        }
    }

    Ok(finalize(md, bytes_read, started))
}

fn finalize(md: MultiDigest, bytes: u64, started: Instant) -> FileHashes {
    FileHashes {
        hashes: md.finalize(),
        bytes,
        took_ms: started.elapsed().as_millis() as u64,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;

    #[test]
    fn hashes_a_small_file() {
        let mut t = tempfile::NamedTempFile::new().unwrap();
        t.write_all(b"abc").unwrap();
        let opts = HashOptions {
            algos: vec![Algo::Sha256, Algo::Blake3],
            ..Default::default()
        };
        let out = hash_path(t.path(), &opts, None).unwrap();
        assert_eq!(out.bytes, 3);
        assert_eq!(
            out.hashes[&Algo::Sha256],
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
        assert_eq!(
            out.hashes[&Algo::Blake3],
            "6437b3ac38465133ffb63b75273a8db548c558465d79db03fd359c6cd5bd9d85"
        );
    }

    #[test]
    fn cancellation_returns_cancelled() {

        let mut t = tempfile::NamedTempFile::new().unwrap();
        let data = vec![0u8; 4 * HASH_CHUNK];
        t.write_all(&data).unwrap();
        let cancel = Arc::new(AtomicBool::new(true));
        let opts = HashOptions {
            algos: vec![Algo::Sha256],
            cancel,
            allow_mmap: false,
        };
        let r = hash_path(t.path(), &opts, None);
        assert!(matches!(r, Err(CoreError::Cancelled)));
    }

    #[test]
    fn progress_callback_is_called() {
        let mut t = tempfile::NamedTempFile::new().unwrap();
        let data = vec![1u8; 3 * HASH_CHUNK + 17];
        t.write_all(&data).unwrap();
        let counter = std::sync::Arc::new(std::sync::atomic::AtomicU64::new(0));
        let c2 = counter.clone();
        let opts = HashOptions {
            algos: vec![Algo::Sha256],
            allow_mmap: false,
            ..Default::default()
        };
        let cb: ProgressCb = Box::new(move |n| {
            c2.store(n, std::sync::atomic::Ordering::Relaxed);
        });
        let out = hash_path(t.path(), &opts, Some(cb)).unwrap();
        assert_eq!(out.bytes, data.len() as u64);
        assert_eq!(
            counter.load(std::sync::atomic::Ordering::Relaxed),
            data.len() as u64
        );
    }
}
