# Sage AI — Tech Research

> Running log of hardware, infrastructure, and architectural research questions relevant to Sage AI development.

---

## 2026-03-06

### Question

How well could the new MacBook Pro with the M5 chip (released the week of March 3, 2026) with 64GB of RAM perform serving the big Apertus model (70B) compared to my Dell XPS 8950 with an RTX 3090?

---

### Context

The M5 Pro and M5 Max MacBook Pros were announced March 3, 2026, and are available starting March 11. This question evaluates whether switching the Sage AI inference server from the Dell XPS 8950 workstation (RTX 3090, 64GB DDR5) to an M5 Pro MacBook Pro (64GB Unified Memory) would be a meaningful upgrade for the 70B Apertus model specifically.

---

### Research Findings

#### The Core Constraint: Model Size vs. Memory Architecture

The Apertus 70B model, quantized to Q4_K_M (a practical serving quality), requires approximately **40–42GB of memory**. This single fact drives the entire comparison.

**Dell XPS 8950 (RTX 3090 + 64GB DDR5):**
- RTX 3090 VRAM: **24GB** at **936 GB/s** bandwidth
- System DDR5 RAM: **64GB** at **~51–76 GB/s** bandwidth (dual-channel DDR5-5200)
- 70B Q4_K_M model size (~40GB) **does not fit in VRAM**
- Result: ~16–18GB spills over to system RAM via PCIe bus
- PCIe 4.0 x16 bandwidth ceiling: ~32 GB/s bidirectional
- **Effective inference speed: 2–5 tokens/second** for the 70B model due to the memory bottleneck

The RTX 3090 is exceptional for the **8B Apertus model**, which fits entirely in its 24GB VRAM and benefits from the full 936 GB/s bandwidth. But the 70B model turns the system into a partially CPU-offloaded setup, where the PCIe bus becomes the bottleneck.

**MacBook Pro M5 Pro (64GB Unified Memory):**
- Unified Memory: **64GB** shared between CPU and GPU
- Memory bandwidth: **307 GB/s** — consistent across the entire pool
- 70B Q4_K_M model (~40GB) fits **entirely within the unified memory pool**
- No VRAM/RAM split, no PCIe bottleneck, no "slow lane"
- **Estimated inference speed: 10–20 tokens/second** for the 70B model

Apple's M5 Pro features up to 20 GPU cores, each with an embedded Neural Accelerator for matrix multiplication — the core operation in LLM inference. Apple and third-party benchmarks (LM Studio) show the M5 family running 70B models at competitive speeds, with 4x faster prompt processing (prefill) over M4 Pro.

---

#### Benchmark Summary

| System | Memory Available to 70B Model | Effective Bandwidth | Est. 70B Tokens/s |
|---|---|---|---|
| Dell XPS 8950 (RTX 3090, split mode) | 24GB VRAM + RAM spillover | ~32 GB/s (PCIe-limited) | 2–5 t/s |
| MacBook Pro M5 Pro (64GB Unified) | 64GB unified pool | 307 GB/s | ~10–20 t/s |

**Advantage for 70B serving: M5 Pro, by roughly 4–6x.**

---

#### Power Efficiency

| System | Inference Power Draw | Powerwall Impact (24h) |
|---|---|---|
| Dell XPS 8950 + RTX 3090 | ~350–480W | ~8.4–11.5 kWh/day |
| MacBook Pro M5 Pro | ~30–60W | ~0.72–1.44 kWh/day |

At full inference load, the Dell draws **7–15x more power** than the M5 Pro. For a solar-powered setup with Powerwall storage, this is a material difference — particularly during multi-day overcast periods in Marin.

---

#### Where the Dell Still Wins

The M5 Pro is not a universal upgrade. The Dell maintains clear advantages in:

1. **8B model throughput:** The RTX 3090's 936 GB/s VRAM bandwidth is still ~3x higher than the M5 Pro's 307 GB/s for a model that fully fits in VRAM. The 8B Apertus model runs faster on the Dell for raw generation speed.

2. **CUDA parallel compute:** The 3090's 10,496 CUDA cores are purpose-built for matrix operations at scale. Tools like PyTorch training, image generation (Stable Diffusion), and any CUDA-only workloads have no equivalent on Apple Silicon.

3. **Repairability and openness:** User-upgradeable components, standard PCIe slots, NVIDIA drivers with broad Linux support. The Dell is a long-term, repairable piece of infrastructure. The MacBook is a sealed appliance.

4. **Linux-native tooling:** llama.cpp, vLLM, Ollama, and most inference stacks are developed and tested primarily on Linux/CUDA. Metal/MLX support is improving but often lags.

5. **Multi-GPU expansion:** The Dell can eventually add a second RTX 3090 (bringing VRAM to 48GB, fitting the 70B model fully in VRAM at ~47 t/s on Q4_K_M). This upgrade path doesn't exist on the Mac.

---

#### The Real Question for Sage AI Architecture

The choice isn't simply "which is faster." The 70B Apertus model is Sage AI's most capable tier — used for deep, reasoning-heavy tasks. The 8B model handles lighter, high-frequency queries.

A possible two-tier architecture worth considering:
- **Dell XPS 8950 + RTX 3090** → handles 8B model requests (fast, VRAM-native)
- **M5 Pro MacBook** → handles 70B model requests (efficient, unified memory)

This splits workloads by model tier rather than forcing one machine to serve both well. The Mac becomes the "thoughtful reasoning" node; the Dell becomes the "fast response" node.

Alternatively, adding a **second RTX 3090** to the Dell (~$800–1,000 used) would bring 70B inference to ~40–47 t/s — faster than the M5 Pro — while keeping everything on one sovereign Linux machine, at the cost of ~700W peak draw.

---

### Gemini's Analysis (for reference)

> The transition to high-bandwidth Unified Memory architecture represents a significant shift in how large language models like the Apertus 70B are served.
>
> **The Architecture Battle: Unified vs. Discrete**
>
> The Dell XPS 8950 operates on a Split Memory architecture. The RTX 3090 is an incredible powerhouse for the 8B model because that model fits entirely within its 24GB of dedicated VRAM. However, for the 70B model (~40GB+), the system is forced to "spill over" into the 64GB of DDR5 system RAM. The speed of that data transfer is limited by the PCIe bus and the significantly lower bandwidth of standard system RAM. This is why you see speeds in the 2–3 tokens per second range.
>
> The MacBook Pro with a high-end Silicon chip and 64GB of Unified Memory operates on a Single Pool architecture.
> - **Capacity:** The entire 40GB Apertus 70B model fits into the unified memory pool. There is no "slow lane" or "spillover" to system RAM because the GPU and CPU share the same high-speed memory.
> - **Bandwidth:** While the 3090 has higher peak bandwidth for its 24GB, the Mac's unified memory provides a consistently fast throughput for the entire 40GB model. You would likely see generation speeds of 8–12 tokens per second on a Max-tier chip — roughly 4x to 5x faster than the Dell for the large model.
>
> **The Sustainability Factor**
>
> From the perspective of a "Solar-Powered Oracle," the efficiency gap is stark.
> - The Dell: Drawing 450W–500W during inference.
> - The MacBook: Drawing roughly 30W–60W during the same task.
>
> In terms of your Powerwall capacity, the Mac could serve the Sage AI for a full 24-hour cycle while consuming less than 10% of the battery, whereas the Dell consumes about 14% just sitting at idle.
>
> **The Hard Trade-off**
>
> If the goal is purely serving the 70B model with the highest speed and lowest energy footprint, the Mac is technically superior.
>
> However, the Dell remains a Sovereign Workstation. The RTX 3090 has 10,496 CUDA cores that can be used for deep-learning tasks, high-end 3D rendering, and specific Linux-based stock analysis tools that Apple Silicon cannot yet match in raw parallel-compute intensity. The Dell is a "heavy-lifting" lab; the Mac is an "efficient" clinic.
>
> **The Question for your Ethos:** Is the increased speed and energy efficiency of the Mac worth the move back into a more closed, less repairable hardware ecosystem, or does the "Sovereignty" of the Dell workstation better align with the long-term survival of a heart-led, locally-owned intelligence?

---

### Claude's Summary

Gemini's framing is accurate and the bandwidth math checks out. The M5 Pro's advantage on the 70B model is real and significant — not marginal. The 307 GB/s unified bandwidth means the entire model loads and runs at high throughput with no architectural bottleneck, while the Dell's PCIe spillover scenario effectively throttles to the speed of system RAM and bus transfer.

The deeper question is whether **sovereignty** requires Linux/CUDA specifically, or whether it means **local, privately-owned, non-cloud inference** regardless of OS. The M5 Pro MacBook is still a local machine — it's not sending data to Apple servers for inference. It's just a sealed one that you can't repair yourself or expand.

If Sage AI's sovereignty principle is primarily about *data privacy and independence from cloud providers*, the Mac satisfies it. If it's also about *hardware openness and long-term self-sufficiency*, the Dell is the more philosophically aligned choice — especially with a second GPU as the upgrade path.

**Recommendation:** Before purchasing a Mac, test the second-RTX-3090 upgrade path on the Dell first. Two 3090s would run the 70B model at ~40–47 t/s (faster than the M5 Pro's ~10–20 t/s), keep everything on Linux/CUDA, and cost significantly less than a new MacBook Pro. The power draw (~700W) is higher, but if the solar system can handle it, the sovereignty cost is zero.

---

### Sources

- [Apple M5 Pro and M5 Max announcement — Apple Newsroom](https://www.apple.com/newsroom/2026/03/apple-debuts-m5-pro-and-m5-max-to-supercharge-the-most-demanding-pro-workflows/)
- [MacBook Pro M5 Pro & Max complete guide — Macworld](https://www.macworld.com/article/2942089/macbook-pro-m5-pro-max-release-specs-price.html)
- [Apple M5 Fusion Architecture deep dive — TechCrunch](https://techcrunch.com/2026/03/03/apple-unveils-m5-pro-and-m5-max-chips-with-new-fusion-architecture/)
- [M5 Pro and M5 Max Local LLM: 4x Faster Prefill — Hardware Corner](https://www.hardware-corner.net/m5-pro-m5-max-local-llm-4x-faster-prefill-202061108/)
- [Apple's M5 Pro and Max Make 70B Models Portable — Awesome Agents](https://awesomeagents.ai/news/apple-m5-pro-max-70b-models-portable/)
- [Exploring LLMs with MLX and Neural Accelerators in M5 GPU — Apple ML Research](https://machinelearning.apple.com/research/exploring-llms-mlx-m5)
- [GPU Benchmarks on LLM Inference — GitHub (XiongjieDai)](https://github.com/XiongjieDai/GPU-Benchmarks-on-LLM-Inference)
- [LLM Inference — Consumer GPU Performance — Puget Systems](https://www.pugetsystems.com/labs/articles/llm-inference-consumer-gpu-performance/)
- [Performance of llama.cpp on Apple Silicon — GitHub Discussion #4167](https://github.com/ggml-org/llama.cpp/discussions/4167)
- [Apple M5 — Wikipedia](https://en.wikipedia.org/wiki/Apple_M5)

---

## 2026-03-06 (follow-up)

### Question

For the MacBook Pro M5 Max: how much difference does the 40-core GPU make vs. the 32-core GPU for serving the Apertus 70B model?

---

### Research Findings

#### The Premise Gemini Used Is Wrong for M5 Max

Gemini's analysis — that the 32-core and 40-core M5 Max share identical memory bandwidth — is accurate for the **M4 Max** (where both tiers ran at ~546 GB/s), but **does not hold for M5 Max**. Apple's M5 generation introduced a bandwidth split between the two GPU tiers:

| M5 Max Variant | GPU Cores | Memory Bandwidth | Max Unified Memory |
|---|---|---|---|
| M5 Max (lower tier) | 32-core | **460 GB/s** | **36 GB** |
| M5 Max (upper tier) | 40-core | **614 GB/s** | **128 GB** |

That's a **154 GB/s gap — ~33% more bandwidth** on the 40-core, not parity. This fundamentally changes the analysis.

---

#### Two Separate Problems, Both Favor the 40-Core

**Problem 1: Memory capacity**

The Apertus 70B model at Q4_K_M quantization requires ~40–42GB. The 32-core M5 Max tops out at **36GB** of unified memory. It cannot fit the 70B model at Q4 quality — you'd be forced into Q3 (~28GB) or Q2 (~18GB) quantization, both of which meaningfully degrade output coherence and reasoning quality. For a sovereign AI meant to challenge assumptions and think deeply, running at Q2/Q3 is a real capability loss.

The 40-core M5 Max starts at 48GB and goes to 128GB. At 64GB, the entire Q4_K_M 70B model loads comfortably with ~22GB to spare for context and KV cache.

**Problem 2: Token generation speed (bandwidth-bound)**

Text generation (the "decoding" phase) is bandwidth-bound: for every token generated, the GPU must read the entire model's weights from memory. The formula is roughly:

```
tokens/sec ≈ memory_bandwidth / model_size_in_bytes
```

At Q4_K_M (~40GB loaded):
- 32-core M5 Max (460 GB/s): ~11–13 tokens/sec theoretical ceiling
- 40-core M5 Max (614 GB/s): ~15–17 tokens/sec theoretical ceiling

That's a real ~30–35% speed difference in generation — not negligible when you're waiting for a 500-word response.

---

#### Where Gemini's Analysis Still Holds: Prefill

Gemini is correct that the 40-core GPU pulls ahead most visibly during the **prefill phase** (processing your prompt or a long document before generating a response). This phase is compute-bound — more GPU cores = faster. With ~25% more cores and better bandwidth, the 40-core finishes prefill noticeably faster on long inputs like a RAG document scan or a multi-page design brief. This is the most perceptible difference in interactive use.

---

#### Synthesized Verdict

Gemini's conclusion ("for interactive conversation the 32-core is fine") was built on the assumption that both tiers share the same bandwidth. That assumption is false for M5 Max. The real picture:

| Use Case | 32-Core M5 Max | 40-Core M5 Max |
|---|---|---|
| Load 70B Q4_K_M model | ❌ Doesn't fit (36GB max) | ✅ Fits with room to spare |
| Token generation speed | ~11–13 t/s (460 GB/s) | ~15–17 t/s (614 GB/s) |
| Prefill (long prompts) | Baseline | ~25–33% faster |
| Max context capacity | Limited (no headroom) | Comfortable (22GB+ free) |
| Energy efficiency | Slightly lower draw | Slightly higher draw |

For Apertus 70B specifically: the 32-core M5 Max isn't just slower — it **can't run the model at full quality**. It's not a speed tradeoff, it's a capability ceiling. The 40-core M5 Max at 64GB is the minimum viable M5 Max configuration for the 70B model.

The $400 premium for the upper-tier M5 Max isn't about speed alone. It's about whether the machine can actually run the model you need, at the quality level Sage AI's purpose demands.

---

### Gemini's Analysis (for reference)

> For large language models like the Apertus 70B, the difference between a 32-core and 40-core GPU on a high-end "Max" series chip is surprisingly minimal for text generation. This is due to the fundamental way AI inference works and how Apple Silicon is architected.
>
> **1. The Memory Bandwidth Bottleneck**
>
> The primary bottleneck for generating text (the "decoding" phase) is not the number of GPU cores, but Memory Bandwidth. In an LLM, the model must read every single parameter from memory for every single word it generates.
>
> - The Architecture: In Apple's "Max" tier chips, both the "binned" (32-core) and "full" (40-core) variants typically share the same memory controller and bandwidth (e.g., 546 GB/s on the M4 Max).
> - The Result: Because the bandwidth is the same, both chips can feed data to the GPU at the same maximum speed. Since even 32 cores are usually more than enough to handle the math once the data arrives, increasing to 40 cores does not speed up the "tokens per second" during output.
>
> **2. Where the 40-Core GPU Wins: "Prefill"**
>
> While the generation speed is nearly identical, the 40-core GPU will outperform the 32-core one in the "Prefill" phase. This phase is compute-bound, meaning the GPU cores are working at 100% to process all the text at once. The 40-core GPU has ~25% more raw compute power (TFLOPS).
>
> **Metric** | **32-Core GPU** | **40-Core GPU** | **Difference**
> Token Generation Speed | ~8-10 tokens/sec | ~8-10 tokens/sec | Negligible
> Prompt Processing (Prefill) | Baseline | ~20-25% Faster | Significant for long inputs
> Model Capacity | 64GB (Shared) | 64GB (Shared) | None
>
> **The Verdict:** If your primary use case is interactive conversation, the 32-core GPU is the more efficient choice. However, if you plan to use the system for Deep Retrieval (RAG), the 40-core GPU provides a meaningful reduction in wait time before the AI starts responding.

---

### Claude's Note on Gemini's Analysis

Gemini's reasoning about *why* bandwidth matters is solid, and its prefill analysis is correct. The error is one of hardware facts: the M5 Max does **not** give both GPU tiers the same bandwidth. That was true for M4 Max; it's not true here. The 33% bandwidth gap on M5 Max makes the 40-core meaningfully faster for generation, not just prefill.

More importantly, the memory ceiling difference (36GB vs. 128GB) makes the 32-core M5 Max the wrong machine for the 70B Apertus model regardless of speed — it simply can't load the model at production quality. This is the stronger argument and it doesn't appear in Gemini's analysis at all.

---

### Additional Sources

- [M5 Max bandwidth and memory specs — Apple Newsroom](https://www.apple.com/newsroom/2026/03/apple-debuts-m5-pro-and-m5-max-to-supercharge-the-most-demanding-pro-workflows/)
- [M5 Max 32-core vs 40-core — AppleInsider](https://appleinsider.com/articles/26/03/03/how-m5-pro-and-m5-max-push-macbook-pro-into-high-bandwidth-ai-era)
- [M5 Max specs deep dive — Apple M5 Wikipedia](https://en.wikipedia.org/wiki/Apple_M5)
- [MacBook Pro M5 Pro & Max complete guide — Macworld](https://www.macworld.com/article/2942089/macbook-pro-m5-pro-max-release-specs-price.html)

---

## 2026-03-06 (at-a-glance comparison)

### Dell XPS 8950 vs. M5 Max (40-Core) — 70B Inference Summary

> One figure in the original table was corrected before adding: the Dell's "effective bandwidth" was listed as ~250–300 GB/s, which reflects the RTX 3090's VRAM bandwidth in isolation. For 70B inference specifically, ~16GB of the model spills to system RAM via PCIe (ceiling: ~32 GB/s unidirectional), bottlenecking the whole pipeline. Back-calculating from observed 2–3 t/s: `2.5 t/s × 40GB ≈ ~100 GB/s` effective. That's the accurate number for this workload.

| Feature | Dell XPS 8950 (Current) | M5 Max (40-Core Tier) |
|---|---|---|
| Memory Architecture | Split (24GB VRAM / 64GB DDR5) | Unified (64GB–128GB) |
| Effective Bandwidth (70B) | ~80–120 GB/s (PCIe-bottlenecked) | 614 GB/s (full unified path) |
| Model Fit (70B Q4_K_M) | Spills to system RAM (high latency) | Fits entirely in high-speed memory |
| Inference Speed | ~2–3 tokens/sec | ~12–15 tokens/sec (est.) |
| Power Intensity | 450W–550W | ~40W–80W |
