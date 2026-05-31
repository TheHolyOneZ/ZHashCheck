// Copyright (c) 2026 TheHolyOneZ


use blake2::{
    digest::{Update, VariableOutput},
    Blake2bVar, Blake2sVar,
};
use crc32fast::Hasher as Crc32;
use digest::Digest;
use md5::Md5;
use serde::{Deserialize, Serialize};
use sha1::Sha1;
use sha2::{Sha224, Sha256, Sha384, Sha512};
use sha3::{Sha3_256, Sha3_512};
use std::str::FromStr;
use ts_rs::TS;
use xxhash_rust::xxh3::{Xxh3, Xxh3Builder};


#[derive(Debug, Copy, Clone, Eq, PartialEq, Ord, PartialOrd, Hash, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/bindings/")]
#[serde(rename_all = "kebab-case")]
pub enum Algo {
    Md5,
    Sha1,
    Sha224,
    Sha256,
    Sha384,
    Sha512,
    Sha3_256,
    Sha3_512,
    Blake2b256,
    Blake2s256,
    Blake3,
    Xxh3_64,
    Xxh3_128,
    Crc32,
}

impl Algo {

    pub const fn hex_len(self) -> usize {
        match self {
            Algo::Crc32 => 8,
            Algo::Xxh3_64 => 16,
            Algo::Md5 => 32,
            Algo::Sha1 => 40,
            Algo::Xxh3_128 => 32,
            Algo::Sha224 => 56,
            Algo::Sha256 | Algo::Sha3_256 | Algo::Blake2b256 | Algo::Blake2s256 | Algo::Blake3 => {
                64
            }
            Algo::Sha384 => 96,
            Algo::Sha512 | Algo::Sha3_512 => 128,
        }
    }


    pub const fn cryptographic(self) -> bool {
        !matches!(self, Algo::Crc32 | Algo::Xxh3_64 | Algo::Xxh3_128)
    }


    pub const fn legacy(self) -> bool {
        matches!(self, Algo::Md5 | Algo::Sha1)
    }


    pub fn from_hex_len(n: usize) -> Vec<Algo> {
        match n {
            8 => vec![Algo::Crc32],
            16 => vec![Algo::Xxh3_64],
            32 => vec![Algo::Md5, Algo::Xxh3_128],
            40 => vec![Algo::Sha1],
            56 => vec![Algo::Sha224],
            64 => vec![
                Algo::Sha256,
                Algo::Sha3_256,
                Algo::Blake2b256,
                Algo::Blake2s256,
                Algo::Blake3,
            ],
            96 => vec![Algo::Sha384],
            128 => vec![Algo::Sha512, Algo::Sha3_512],
            _ => vec![],
        }
    }


    pub const fn display(self) -> &'static str {
        match self {
            Algo::Md5 => "MD5",
            Algo::Sha1 => "SHA-1",
            Algo::Sha224 => "SHA-224",
            Algo::Sha256 => "SHA-256",
            Algo::Sha384 => "SHA-384",
            Algo::Sha512 => "SHA-512",
            Algo::Sha3_256 => "SHA3-256",
            Algo::Sha3_512 => "SHA3-512",
            Algo::Blake2b256 => "BLAKE2b-256",
            Algo::Blake2s256 => "BLAKE2s-256",
            Algo::Blake3 => "BLAKE3",
            Algo::Xxh3_64 => "xxh3-64",
            Algo::Xxh3_128 => "xxh3-128",
            Algo::Crc32 => "CRC32",
        }
    }
}

impl FromStr for Algo {
    type Err = crate::error::CoreError;
    fn from_str(s: &str) -> Result<Self, Self::Err> {
        let norm: String = s
            .trim()
            .to_ascii_lowercase()
            .chars()
            .filter(|c| !c.is_whitespace())
            .collect();
        let v = match norm.as_str() {
            "md5" => Algo::Md5,
            "sha1" | "sha-1" => Algo::Sha1,
            "sha224" | "sha-224" => Algo::Sha224,
            "sha256" | "sha-256" => Algo::Sha256,
            "sha384" | "sha-384" => Algo::Sha384,
            "sha512" | "sha-512" => Algo::Sha512,
            "sha3-256" | "sha3_256" | "sha-3-256" => Algo::Sha3_256,
            "sha3-512" | "sha3_512" | "sha-3-512" => Algo::Sha3_512,
            "blake2b" | "blake2b256" | "blake2b-256" => Algo::Blake2b256,
            "blake2s" | "blake2s256" | "blake2s-256" => Algo::Blake2s256,
            "blake3" | "b3" => Algo::Blake3,
            "xxh3" | "xxh3-64" | "xxh3_64" => Algo::Xxh3_64,
            "xxh3-128" | "xxh3_128" => Algo::Xxh3_128,
            "crc32" => Algo::Crc32,
            other => return Err(crate::error::CoreError::UnknownAlgo(other.to_string())),
        };
        Ok(v)
    }
}


enum HasherState {
    Md5(Box<Md5>),
    Sha1(Box<Sha1>),
    Sha224(Box<Sha224>),
    Sha256(Box<Sha256>),
    Sha384(Box<Sha384>),
    Sha512(Box<Sha512>),
    Sha3_256(Box<Sha3_256>),
    Sha3_512(Box<Sha3_512>),
    Blake2b256(Box<Blake2bVar>),
    Blake2s256(Box<Blake2sVar>),
    Blake3(Box<blake3::Hasher>),
    Xxh3_64(Box<Xxh3>),
    Xxh3_128(Box<Xxh3>),
    Crc32(Box<Crc32>),
}

impl HasherState {
    fn new(algo: Algo) -> Self {
        match algo {
            Algo::Md5 => Self::Md5(Box::new(Md5::new())),
            Algo::Sha1 => Self::Sha1(Box::new(Sha1::new())),
            Algo::Sha224 => Self::Sha224(Box::new(Sha224::new())),
            Algo::Sha256 => Self::Sha256(Box::new(Sha256::new())),
            Algo::Sha384 => Self::Sha384(Box::new(Sha384::new())),
            Algo::Sha512 => Self::Sha512(Box::new(Sha512::new())),
            Algo::Sha3_256 => Self::Sha3_256(Box::new(Sha3_256::new())),
            Algo::Sha3_512 => Self::Sha3_512(Box::new(Sha3_512::new())),
            Algo::Blake2b256 => {
                Self::Blake2b256(Box::new(Blake2bVar::new(32).expect("valid 32-byte output")))
            }
            Algo::Blake2s256 => {
                Self::Blake2s256(Box::new(Blake2sVar::new(32).expect("valid 32-byte output")))
            }
            Algo::Blake3 => Self::Blake3(Box::new(blake3::Hasher::new())),
            Algo::Xxh3_64 => Self::Xxh3_64(Box::new(Xxh3Builder::new().build())),
            Algo::Xxh3_128 => Self::Xxh3_128(Box::new(Xxh3Builder::new().build())),
            Algo::Crc32 => Self::Crc32(Box::new(Crc32::new())),
        }
    }

    fn update(&mut self, data: &[u8]) {
        match self {
            Self::Md5(h) => Digest::update(h.as_mut(), data),
            Self::Sha1(h) => Digest::update(h.as_mut(), data),
            Self::Sha224(h) => Digest::update(h.as_mut(), data),
            Self::Sha256(h) => Digest::update(h.as_mut(), data),
            Self::Sha384(h) => Digest::update(h.as_mut(), data),
            Self::Sha512(h) => Digest::update(h.as_mut(), data),
            Self::Sha3_256(h) => Digest::update(h.as_mut(), data),
            Self::Sha3_512(h) => Digest::update(h.as_mut(), data),
            Self::Blake2b256(h) => Update::update(h.as_mut(), data),
            Self::Blake2s256(h) => Update::update(h.as_mut(), data),
            Self::Blake3(h) => {
                h.update(data);
            }
            Self::Xxh3_64(h) => h.update(data),
            Self::Xxh3_128(h) => h.update(data),
            Self::Crc32(h) => h.update(data),
        }
    }

    fn finalize_hex(self) -> String {
        match self {
            Self::Md5(h) => hex::encode(h.finalize()),
            Self::Sha1(h) => hex::encode(h.finalize()),
            Self::Sha224(h) => hex::encode(h.finalize()),
            Self::Sha256(h) => hex::encode(h.finalize()),
            Self::Sha384(h) => hex::encode(h.finalize()),
            Self::Sha512(h) => hex::encode(h.finalize()),
            Self::Sha3_256(h) => hex::encode(h.finalize()),
            Self::Sha3_512(h) => hex::encode(h.finalize()),
            Self::Blake2b256(h) => {
                let mut out = [0u8; 32];
                h.finalize_variable(&mut out).expect("32 bytes");
                hex::encode(out)
            }
            Self::Blake2s256(h) => {
                let mut out = [0u8; 32];
                h.finalize_variable(&mut out).expect("32 bytes");
                hex::encode(out)
            }
            Self::Blake3(h) => h.finalize().to_hex().to_string(),
            Self::Xxh3_64(h) => format!("{:016x}", h.digest()),
            Self::Xxh3_128(h) => format!("{:032x}", h.digest128()),
            Self::Crc32(h) => format!("{:08x}", h.finalize()),
        }
    }
}


pub struct MultiDigest {
    algos: Vec<Algo>,
    states: Vec<HasherState>,
}

impl MultiDigest {
    pub fn new(algos: &[Algo]) -> Self {
        let mut unique: Vec<Algo> = algos.to_vec();
        unique.sort();
        unique.dedup();
        let states = unique.iter().map(|a| HasherState::new(*a)).collect();
        Self {
            algos: unique,
            states,
        }
    }


    pub fn update(&mut self, data: &[u8]) {
        if self.states.len() >= 3 {
            use rayon::prelude::*;
            self.states.par_iter_mut().for_each(|h| h.update(data));
        } else {
            for h in self.states.iter_mut() {
                h.update(data);
            }
        }
    }


    pub fn finalize(self) -> std::collections::BTreeMap<Algo, String> {
        let mut out = std::collections::BTreeMap::new();
        for (a, h) in self.algos.into_iter().zip(self.states) {
            out.insert(a, h.finalize_hex());
        }
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn one(algo: Algo, data: &[u8]) -> String {
        let mut m = MultiDigest::new(&[algo]);
        m.update(data);
        m.finalize().remove(&algo).unwrap()
    }


    #[test]
    fn md5_empty() {
        assert_eq!(one(Algo::Md5, b""), "d41d8cd98f00b204e9800998ecf8427e");
    }


    #[test]
    fn md5_abc() {
        assert_eq!(one(Algo::Md5, b"abc"), "900150983cd24fb0d6963f7d28e17f72");
    }


    #[test]
    fn sha1_abc() {
        assert_eq!(
            one(Algo::Sha1, b"abc"),
            "a9993e364706816aba3e25717850c26c9cd0d89d"
        );
    }


    #[test]
    fn sha256_abc() {
        assert_eq!(
            one(Algo::Sha256, b"abc"),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
    }


    #[test]
    fn sha512_abc() {
        assert_eq!(
            one(Algo::Sha512, b"abc"),
            "ddaf35a193617abacc417349ae20413112e6fa4e89a97ea20a9eeee64b55d39a\
             2192992a274fc1a836ba3c23a3feebbd454d4423643ce80e2a9ac94fa54ca49f"
        );
    }


    #[test]
    fn sha3_256_abc() {
        assert_eq!(
            one(Algo::Sha3_256, b"abc"),
            "3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532"
        );
    }


    #[test]
    fn blake3_empty_and_abc() {
        assert_eq!(
            one(Algo::Blake3, b""),
            "af1349b9f5f9a1a6a0404dea36dcc9499bcb25c9adc112b7cc9a93cae41f3262"
        );
        assert_eq!(
            one(Algo::Blake3, b"abc"),
            "6437b3ac38465133ffb63b75273a8db548c558465d79db03fd359c6cd5bd9d85"
        );
    }


    #[test]
    fn blake2b_abc() {
        assert_eq!(
            one(Algo::Blake2b256, b"abc"),
            "bddd813c634239723171ef3fee98579b94964e3bb1cb3e427262c8c068d52319"
        );
    }


    #[test]
    fn blake2s_abc() {
        assert_eq!(
            one(Algo::Blake2s256, b"abc"),
            "508c5e8c327c14e2e1a72ba34eeb452f37458b209ed63a294d999b4c86675982"
        );
    }


    #[test]
    fn crc32_abc() {
        assert_eq!(one(Algo::Crc32, b"abc"), "352441c2");
    }


    #[test]
    fn multi_matches_single() {
        let data: Vec<u8> = (0..10_000u32).map(|i| (i & 0xff) as u8).collect();
        let mut m = MultiDigest::new(&[Algo::Md5, Algo::Sha256, Algo::Blake3, Algo::Sha1]);
        m.update(&data);
        let out = m.finalize();
        assert_eq!(out[&Algo::Md5], one(Algo::Md5, &data));
        assert_eq!(out[&Algo::Sha1], one(Algo::Sha1, &data));
        assert_eq!(out[&Algo::Sha256], one(Algo::Sha256, &data));
        assert_eq!(out[&Algo::Blake3], one(Algo::Blake3, &data));
    }


    #[test]
    fn chunked_matches_whole() {
        let data: Vec<u8> = (0..32_768u32).map(|i| (i & 0xff) as u8).collect();
        let whole = one(Algo::Sha256, &data);
        let mut m = MultiDigest::new(&[Algo::Sha256]);
        for chunk in data.chunks(977) {
            m.update(chunk);
        }
        assert_eq!(m.finalize()[&Algo::Sha256], whole);
    }

    #[test]
    fn algo_parse() {
        for s in ["sha256", "SHA-256", "Sha256", "  sha-256  "] {
            assert_eq!(s.parse::<Algo>().unwrap(), Algo::Sha256);
        }
        assert_eq!("blake3".parse::<Algo>().unwrap(), Algo::Blake3);
        assert!("nonsense".parse::<Algo>().is_err());
    }

    #[test]
    fn from_hex_len_covers_all() {

        for algo in [
            Algo::Md5,
            Algo::Sha1,
            Algo::Sha224,
            Algo::Sha256,
            Algo::Sha384,
            Algo::Sha512,
            Algo::Sha3_256,
            Algo::Sha3_512,
            Algo::Blake2b256,
            Algo::Blake2s256,
            Algo::Blake3,
            Algo::Xxh3_64,
            Algo::Xxh3_128,
            Algo::Crc32,
        ] {
            let candidates = Algo::from_hex_len(algo.hex_len());
            assert!(
                candidates.contains(&algo),
                "{:?} missing from len {}",
                algo,
                algo.hex_len()
            );
        }
    }
}
