# 9231 WM Source Remediation Gate

- generated_on: `2026-06-06`
- gate_status: `pass`
- Freeze posture lifted by machine gate: `true`
- Tracked `WM_*.pdf` paths were preserved; only source PDF bytes were eligible for replacement.
- DB/search/RAG consumption claimed: false.
- No crop, visual, text, authority, DB, search, RAG, or release work was run.

## Gate Counts

| metric | value |
| --- | ---: |
| target source PDFs | 18 |
| verified or replaced source PDFs | 18 |
| replaced source PDFs | 18 |
| red-pixel gate passes | 18 |
| provenance records | 18 |
| page-count matches | 18 |
| PDF signature passes | 18 |
| affected frozen rows | 150 |
| affected shards | 6 |
| before red pixels | 1175796 |
| after red pixels | 0 |

## Render Gate

- renderer: `pdfjs-dist + @napi-rs/canvas`
- scale: `1.5`
- red pixel rule: `r > 150 && g < 110 && b < 110`

## Affected Shards

| shard | frozen rows |
| --- | ---: |
| `9231_p1_s20_standard_001` | 21 |
| `9231_p1_w19_standard_001` | 33 |
| `9231_p2_s20_standard_001` | 24 |
| `9231_p2_w19_standard_001` | 33 |
| `9231_p3_s20_standard_001` | 21 |
| `9231_p4_s20_standard_001` | 18 |

## Source Replacement Matrix

| source PDF | before SHA256 | after SHA256 | bytes before | bytes after | pages | before red pixels | after red pixels | action | provenance |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `data/past-papers/9231Further-Mathematics/paper1/WM_9231_s20_qp_11.pdf` | `a5a4427fba520cb317c09c5fed9cbc470cb93d5ae23bcfa6731eb7198673edc7` | `713509fac5492b3b50609be541779d1efad518486edd541b5cfb169ecc3b01e6` | 2814168 | 1113333 | 16 | 58064 | 0 | `replaced_bytes_in_place` | [QualifiedQuest](https://qualifiedquest.com/papers/a-level/mathematics-further-9231/2020/9231_s20_qp_11.pdf) |
| `data/past-papers/9231Further-Mathematics/paper1/WM_9231_s20_qp_12.pdf` | `2576abbe7dc9898a26ace19f4e10ae95a4bd24cdf57093a8e6afbb9ba2a9381c` | `81da173c5f6ed6e754760acaf8c0bfcfbed089b505ccc1c397fae3ac1e897743` | 2814715 | 1113885 | 16 | 58064 | 0 | `replaced_bytes_in_place` | [QualifiedQuest](https://qualifiedquest.com/papers/a-level/mathematics-further-9231/2020/9231_s20_qp_12.pdf) |
| `data/past-papers/9231Further-Mathematics/paper1/WM_9231_s20_qp_13.pdf` | `223b225e85fba1287c27e985a5e3a496954d486fca17f6fb2495e9a989f8dbfc` | `c01f89b737a652072749f67e6668d1bcf6dd14950488e6ac329db4df0fb98a10` | 2823001 | 1122403 | 16 | 58064 | 0 | `replaced_bytes_in_place` | [QualifiedQuest](https://qualifiedquest.com/papers/a-level/mathematics-further-9231/2020/9231_s20_qp_13.pdf) |
| `data/past-papers/9231Further-Mathematics/paper1/WM_9231_w19_qp_11.pdf` | `59d8c2cb32955733527849b3a399d03814b7f243a3fa93cb08b552ac37dda2de` | `5c32d73abb9e0d7175b4e360669e53cd29fa8445fb3f25ee018da277e7ff453a` | 2716590 | 136570 | 24 | 87096 | 0 | `replaced_bytes_in_place` | [QualifiedQuest](https://qualifiedquest.com/papers/a-level/mathematics-further-9231/2019/9231_w19_qp_11.pdf) |
| `data/past-papers/9231Further-Mathematics/paper1/WM_9231_w19_qp_12.pdf` | `5d49522b9b75a7642cf4b183e09e739bf67e6db7ca479897d8590a69f5caaaf2` | `b5a81deb1e88bf884a01cd0ee6032b55b2801dedf87b8765e6aa4079f1aab9ec` | 2716485 | 136465 | 24 | 87096 | 0 | `replaced_bytes_in_place` | [QualifiedQuest](https://qualifiedquest.com/papers/a-level/mathematics-further-9231/2019/9231_w19_qp_12.pdf) |
| `data/past-papers/9231Further-Mathematics/paper1/WM_9231_w19_qp_13.pdf` | `7e44184c30a77641c139c6140e8b5b9b85696ec4e23f393edd579b274bc38ffb` | `f4ff612d8824486afb7e3f0d26ebcc9819e3baab14dfbca3d394325d234e0183` | 2716301 | 136281 | 24 | 87096 | 0 | `replaced_bytes_in_place` | [QualifiedQuest](https://qualifiedquest.com/papers/a-level/mathematics-further-9231/2019/9231_w19_qp_13.pdf) |
| `data/past-papers/9231Further-Mathematics/paper2/WM_9231_s20_qp_21.pdf` | `cca34797fb99c34f596d1cbf486fc04061c890d423a9b15edaf2d62969cb45c2` | `0102c387ffeed2d3a66cad83e1d65d730591b947418f062999231a52ab609cb6` | 2841325 | 1141025 | 16 | 58064 | 0 | `replaced_bytes_in_place` | [QualifiedQuest](https://qualifiedquest.com/papers/a-level/mathematics-further-9231/2020/9231_s20_qp_21.pdf) |
| `data/past-papers/9231Further-Mathematics/paper2/WM_9231_s20_qp_22.pdf` | `d61a8cf228bc00f57a93332ff7afaf0f75cceff57af77c20f80d882cd50bd091` | `cd6a885e53e9c26746112aacf86e79ee0ecabed6f190127d40fffdf679bbe1a9` | 2841765 | 1141465 | 16 | 58064 | 0 | `replaced_bytes_in_place` | [QualifiedQuest](https://qualifiedquest.com/papers/a-level/mathematics-further-9231/2020/9231_s20_qp_22.pdf) |
| `data/past-papers/9231Further-Mathematics/paper2/WM_9231_s20_qp_23.pdf` | `15fcb88b2b5ca94b7728f840eb122d0971121cedc9668b60002f97c94d3eabef` | `f51875d1712ccfe10c11dece6434df495034f132af8a2f7d4f79155a1a143642` | 2858099 | 1157638 | 16 | 58064 | 0 | `replaced_bytes_in_place` | [QualifiedQuest](https://qualifiedquest.com/papers/a-level/mathematics-further-9231/2020/9231_s20_qp_23.pdf) |
| `data/past-papers/9231Further-Mathematics/paper2/WM_9231_w19_qp_21.pdf` | `bdc8298ff085cfbadb0b76935faba73ce1cd4825b0e83748400bcaaf156777d4` | `85cbe7d528e44d295c242eef3f4842dcc087b5150399c2bac972750dbda1859d` | 2728619 | 148555 | 24 | 87096 | 0 | `replaced_bytes_in_place` | [QualifiedQuest](https://qualifiedquest.com/papers/a-level/mathematics-further-9231/2019/9231_w19_qp_21.pdf) |
| `data/past-papers/9231Further-Mathematics/paper2/WM_9231_w19_qp_22.pdf` | `c833854a5d9aa7d950d94ed3d2e5c39041b075c2699ce336e4f2e8b613ccb825` | `57211f025bbf247431c450dd87aed239dbf9e78e42f93a8688e6d791d32c8005` | 2728870 | 148806 | 24 | 87096 | 0 | `replaced_bytes_in_place` | [QualifiedQuest](https://qualifiedquest.com/papers/a-level/mathematics-further-9231/2019/9231_w19_qp_22.pdf) |
| `data/past-papers/9231Further-Mathematics/paper2/WM_9231_w19_qp_23.pdf` | `06c2d222de25d580be25831042b8a549f422a6a511f70aba0daf471519d4b985` | `e17a4e87b6dd86aa63299605894f213d248f8b7c3eed8a48b2ac520b38ea97a8` | 2728501 | 148437 | 24 | 87096 | 0 | `replaced_bytes_in_place` | [QualifiedQuest](https://qualifiedquest.com/papers/a-level/mathematics-further-9231/2019/9231_w19_qp_23.pdf) |
| `data/past-papers/9231Further-Mathematics/paper3/WM_9231_s20_qp_31.pdf` | `b5e2df0effb714d81202d7f7e0eff431c41c6ed64028d69c9a1d12828c2913d9` | `eb9b43beac9dd6538bcdae21cc5e1d4d089b910acf4bd5b39f973738722a38e3` | 2828097 | 1126604 | 16 | 58064 | 0 | `replaced_bytes_in_place` | [QualifiedQuest](https://qualifiedquest.com/papers/a-level/mathematics-further-9231/2020/9231_s20_qp_31.pdf) |
| `data/past-papers/9231Further-Mathematics/paper3/WM_9231_s20_qp_32.pdf` | `a6f02b8df4af5f4a037e32ef6331fddbe3cac7620351767797eb2805ba86824e` | `93ca49b3571a45175efc31d31d2c2859038331ef2940af4dddedf53232a579e7` | 2827793 | 1126300 | 16 | 58064 | 0 | `replaced_bytes_in_place` | [QualifiedQuest](https://qualifiedquest.com/papers/a-level/mathematics-further-9231/2020/9231_s20_qp_32.pdf) |
| `data/past-papers/9231Further-Mathematics/paper3/WM_9231_s20_qp_33.pdf` | `18de6b917be187c1d55b4c28098f103af9864cf836521c859545cdd166090ee5` | `7be113a656dbc4fd8b7377e0191931f3b7849be521c582612f7bee6b680af207` | 2894153 | 1192667 | 16 | 58064 | 0 | `replaced_bytes_in_place` | [QualifiedQuest](https://qualifiedquest.com/papers/a-level/mathematics-further-9231/2020/9231_s20_qp_33.pdf) |
| `data/past-papers/9231Further-Mathematics/paper4/WM_9231_s20_qp_41.pdf` | `bc79afa3251c4c7040cc737df74768f233f669761229ff7d24b37f3255090a09` | `e36f99c4db088a559fe0b34513059c4d70ee10160020164be63a2ebfd826dd5a` | 2331978 | 1060356 | 12 | 43548 | 0 | `replaced_bytes_in_place` | [QualifiedQuest](https://qualifiedquest.com/papers/a-level/mathematics-further-9231/2020/9231_s20_qp_41.pdf) |
| `data/past-papers/9231Further-Mathematics/paper4/WM_9231_s20_qp_42.pdf` | `67bd245ece4aabfaea420b027e4c30c4e419f30a06b3dc0c26cc2893ffe41b32` | `3fc21d2b9815900aea12ed9faedd6fee312aadb802e4f797b32ec732f02c59b4` | 2332076 | 1060454 | 12 | 43548 | 0 | `replaced_bytes_in_place` | [QualifiedQuest](https://qualifiedquest.com/papers/a-level/mathematics-further-9231/2020/9231_s20_qp_42.pdf) |
| `data/past-papers/9231Further-Mathematics/paper4/WM_9231_s20_qp_43.pdf` | `004ad08de56b1a3388659f11d5308d0ecd7aa2834208bd51a026d2f2f5db8208` | `4b6954bafc72acaa7914b4442ecb8dd452fd4b9fc3f24db8cb45c4fe929ef650` | 2341148 | 1069672 | 12 | 43548 | 0 | `replaced_bytes_in_place` | [QualifiedQuest](https://qualifiedquest.com/papers/a-level/mathematics-further-9231/2020/9231_s20_qp_43.pdf) |

## Artifacts

- source freeze manifest: `data/manifests/9231_wm_source_freeze_2026_06_05_manifest_v1.json`
- source freeze report: `docs/reports/2026-06-05-9231-wm-source-freeze-gate.md`

## Boundary

- This gate only proves clean source PDF bytes at the 18 tracked paths listed by the freeze gate.
- Downstream crop, visual review, question text, authority, DB, search, RAG, and release gates remain separate work.
