// Copyright (c) 2026 TheHolyOneZ


use crate::error::{CoreError, CoreResult};
use crate::hashing::Algo;
use serde::Serialize;
use std::str::FromStr;
use ts_rs::TS;

#[derive(Debug, Clone, Serialize, TS, Copy, PartialEq, Eq)]
#[ts(export, export_to = "../../src/bindings/")]
#[serde(rename_all = "lowercase")]
pub enum ChecksumKind {


    Gnu,

    Bsd,

    Mixed,
}

#[derive(Debug, Clone)]
pub struct ChecksumEntry {
    pub path: String,
    pub algo: Algo,
    pub hex: String,
}


pub fn parse_checksum_file(
    content: &str,
    hint_ext: Option<&str>,
) -> CoreResult<(ChecksumKind, Vec<ChecksumEntry>)> {
    let hint_algo: Option<Algo> = hint_ext.and_then(|e| Algo::from_str(e).ok());

    let mut gnu = 0u32;
    let mut bsd = 0u32;
    let mut entries = Vec::new();

    for (lineno, raw) in content.lines().enumerate() {
        let line = raw.trim();
        if line.is_empty() || line.starts_with('#') || line.starts_with(';') {
            continue;
        }

        if let Some(e) = parse_bsd(line)? {
            bsd += 1;
            entries.push(e);
            continue;
        }
        if let Some(e) = parse_gnu(line, hint_algo)? {
            gnu += 1;
            entries.push(e);
            continue;
        }
        return Err(CoreError::InvalidChecksumFile(format!(
            "line {}: cannot parse `{}`",
            lineno + 1,
            line
        )));
    }

    let kind = match (gnu, bsd) {
        (g, 0) if g > 0 => ChecksumKind::Gnu,
        (0, b) if b > 0 => ChecksumKind::Bsd,
        (g, b) if g > 0 && b > 0 => ChecksumKind::Mixed,
        _ => return Err(CoreError::InvalidChecksumFile("no entries found".into())),
    };
    Ok((kind, entries))
}

fn parse_bsd(line: &str) -> CoreResult<Option<ChecksumEntry>> {

    let Some(eq_pos) = line.rfind('=') else {
        return Ok(None);
    };
    let head = line[..eq_pos].trim();
    let hex = line[eq_pos + 1..].trim();

    let Some(open) = head.find('(') else {
        return Ok(None);
    };
    let Some(close) = head.rfind(')') else {
        return Ok(None);
    };
    if open >= close {
        return Ok(None);
    }

    let algo_raw = head[..open].trim();
    let path = head[open + 1..close].trim().to_string();
    if hex.is_empty() || path.is_empty() || algo_raw.is_empty() {
        return Ok(None);
    }
    let algo = Algo::from_str(algo_raw)
        .map_err(|_| CoreError::InvalidChecksumFile(format!("unknown algorithm `{algo_raw}`")))?;
    if hex.len() != algo.hex_len() {
        return Err(CoreError::InvalidChecksumFile(format!(
            "{algo_raw} expects {} hex chars, got {}",
            algo.hex_len(),
            hex.len()
        )));
    }
    hex::decode(hex).map_err(CoreError::from)?;
    Ok(Some(ChecksumEntry {
        path,
        algo,
        hex: hex.to_ascii_lowercase(),
    }))
}

fn parse_gnu(line: &str, hint: Option<Algo>) -> CoreResult<Option<ChecksumEntry>> {


    let mut parts = line.splitn(2, char::is_whitespace);
    let Some(hex) = parts.next() else {
        return Ok(None);
    };
    let Some(rest) = parts.next() else {
        return Ok(None);
    };
    let hex = hex.trim();
    let rest = rest.trim_start_matches([' ', '*', '\t']);
    if hex.is_empty() || rest.is_empty() {
        return Ok(None);
    }
    if hex.chars().any(|c| !c.is_ascii_hexdigit()) {
        return Ok(None);
    }
    hex::decode(hex).map_err(CoreError::from)?;
    let candidates = Algo::from_hex_len(hex.len());
    let algo = hint
        .filter(|a| candidates.contains(a))
        .or_else(|| candidates.first().copied())
        .ok_or_else(|| {
            CoreError::InvalidChecksumFile(format!(
                "cannot infer algorithm from {}-char hex",
                hex.len()
            ))
        })?;
    Ok(Some(ChecksumEntry {
        path: rest.to_string(),
        algo,
        hex: hex.to_ascii_lowercase(),
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_gnu_sha256() {
        let body = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad  abc.txt\n\
                    900150983cd24fb0d6963f7d28e17f72  *bin.dat\n";
        let (kind, entries) = parse_checksum_file(body, Some("sha256")).unwrap();
        assert_eq!(kind, ChecksumKind::Gnu);
        assert_eq!(entries.len(), 2);
        assert_eq!(entries[0].path, "abc.txt");
        assert_eq!(entries[0].algo, Algo::Sha256);
        assert_eq!(entries[1].path, "bin.dat");
        assert_eq!(entries[1].algo, Algo::Md5);
    }

    #[test]
    fn parse_bsd_sha256() {
        let body =
            "SHA256 (abc.txt) = ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad\n";
        let (kind, entries) = parse_checksum_file(body, None).unwrap();
        assert_eq!(kind, ChecksumKind::Bsd);
        assert_eq!(entries[0].path, "abc.txt");
        assert_eq!(entries[0].algo, Algo::Sha256);
    }

    #[test]
    fn rejects_garbage() {
        let body = "this is not a checksum line\n";
        assert!(parse_checksum_file(body, Some("sha256")).is_err());
    }

    #[test]
    fn skips_comments_and_blank() {
        let body = "# my checksums\n\n; another comment\nba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad  a\n";
        let (_, entries) = parse_checksum_file(body, Some("sha256")).unwrap();
        assert_eq!(entries.len(), 1);
    }
}
