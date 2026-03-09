# Sustainable Power System Design

> **The Solar Nervous System** — A smart energy management layer that lets Sage AI breathe with the sun: waking when solar energy is abundant, sleeping when it's not, and always telling the truth about where its power comes from.

**Last updated:** 2026-03-04 | **Phase:** 2 (see [sage-ai-todo.md](./sage-ai-todo.md)) | **Status:** Planning

---

## System Architecture

```
                    ┌─────────────────────────────────┐
                    │         9.25 kW Solar Array       │
                    │         (Roof, Marin County)      │
                    └───────────────┬─────────────────┘
                                    │
                    ┌───────────────▼─────────────────┐
                    │   Tesla Powerwall (13.5 kWh)     │
                    │   Battery + Grid Gateway         │
                    └───────────────┬─────────────────┘
                                    │
                       Local Gateway API (LAN)
                      /api/meters/aggregates
                      /api/system_status/soe
                                    │
┌───────────────────────────────────▼──────────────────────────────────┐
│                                                                      │
│   Raspberry Pi 5 (8GB) — Always On (~5W)                            │
│   ┌──────────────────────────────────────────────────────────┐      │
│   │  Home Assistant OS                                        │      │
│   │  ├─ Powerwall Integration (local Gateway API, no cloud)  │      │
│   │  ├─ Shelly Integration (Dell power draw monitoring)      │      │
│   │  ├─ Wake-on-LAN Service (etherwake)                      │      │
│   │  ├─ Sun-Grace Automation (wake Dell when solar surplus)   │      │
│   │  ├─ Lunar Automation (sleep Dell at sunset/low battery)   │      │
│   │  └─ Energy Dashboard (real-time + historical)             │      │
│   └──────────────────────────────────────────────────────────┘      │
│                                                                      │
└──────────────┬──────────────────────────────────┬────────────────────┘
               │                                  │
          WoL Magic Packet                  Shelly Local API
          (wake from S3)                    (power monitoring)
               │                                  │
┌──────────────▼──────────────────────────────────▼────────────────────┐
│                                                                      │
│   Dell XPS 8950 — Sovereign Node (2-500W depending on state)        │
│   ┌──────────────────────────────────────────────────────────┐      │
│   │  Ubuntu 24.04 LTS                                        │      │
│   │  ├─ Ollama (Apertus 8B + 70B)                            │      │
│   │  ├─ Open WebUI (Docker, RAG)                             │      │
│   │  ├─ RTX 3090 (24GB VRAM)                                │      │
│   │  └─ Tailscale (encrypted mesh)                           │      │
│   └──────────────────────────────────────────────────────────┘      │
│                                                                      │
│   ┌─ Shelly Plug US Gen4 ─┐                                        │
│   │  Inline power monitor  │  ← Measures real-time W, V, A, kWh    │
│   │  15A / 1800W rated     │  ← Reports to HA via local HTTP API   │
│   └────────────────────────┘                                        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘

States:
  ☀️  Sun-Grace (Tier 1)  │  Dell awake, full Apertus 70B, ~300-500W under load
  🌙  Lunar (Tier 2)      │  Dell in S3 sleep (~3W), queries queued for sunrise
  💤  Idle                 │  Dell in S3 sleep, no pending queries
```

---

## How It Works

### The Sun-Grace Protocol (Daytime — Tier 1)

The Raspberry Pi monitors solar production and battery state by querying the Powerwall's local Gateway API on the LAN. No cloud service, no subscription, no external network calls. When conditions are right, it wakes the Dell.

**Trigger conditions (all must be true):**
- Solar production > 2.5 kW
- Battery charge > 80%
- Time is between sunrise and 2 hours before sunset (buffer for afternoon clouds)

**Actions:**
1. Pi sends Wake-on-LAN magic packet to the Dell's MAC address
2. Dell wakes from S3 sleep (~10 seconds to full availability)
3. Ollama and Open WebUI are already running (Docker auto-starts)
4. Shelly plug reports power draw ramping up — confirms wake was successful
5. Home Assistant dashboard updates: Sovereignty Tier → 1 (Full Sovereignty)

### The Lunar Protocol (Nighttime — Tier 2)

When solar drops or battery is needed for the home, the Dell goes to sleep.

**Trigger conditions (any one):**
- Solar production < 0.5 kW for more than 15 minutes
- Battery charge < 40%
- Time is past sunset + 30 minutes

**Actions:**
1. Pi sends suspend command to Dell via SSH (`ssh sage-node "systemctl suspend"`)
2. Dell enters S3 sleep (~3W draw)
3. Shelly plug confirms power drop — verifies sleep succeeded
4. Queued AI requests are held until next Sun-Grace wake
5. Home Assistant dashboard updates: Sovereignty Tier → 2 (Reduced Capability)

### Power Monitoring (Continuous)

The Shelly Plug US Gen4 sits inline between the wall outlet and the Dell's power cable. It reports continuously to Home Assistant:

- **Real-time power draw (W)** — Confirms Dell state: ~3W = sleeping, ~80W = idle, ~300-500W = GPU inference
- **Voltage and current (V, A)** — Safety monitoring
- **Cumulative energy (kWh)** — Tracks total energy consumed over time for the HA Energy Dashboard
- **State verification** — If the Pi sends a WoL packet but the Shelly doesn't report a power increase within 60 seconds, the automation retries or alerts

This creates a closed feedback loop: the Pi doesn't just *tell* the Dell what to do — it *verifies* it happened.

---

## Hardware Bill of Materials

### Required (Core System)

| Component | Purpose | Price | Source | Status |
|---|---|---|---|---|
| **Raspberry Pi 5 (8GB)** | Always-on controller: Home Assistant, WoL, solar monitoring | ~$95 | [Authorized resellers](https://www.raspberrypi.com/products/raspberry-pi-5/) (CanaKit, PiShop.us, Adafruit) | In stock |
| **Pi 5 case** | Protection, passive cooling | ~$10-15 | Same resellers | In stock |
| **Pi 5 official PSU (27W USB-C)** | Stable power for Pi + HATs | ~$12 | [Raspberry Pi official](https://www.raspberrypi.com/products/27w-power-supply/) | In stock |
| **NVMe HAT + 256GB NVMe SSD** | Reliable storage for Home Assistant (microSD wears out) | ~$35-50 | Amazon, Pimoroni | In stock |
| **Shelly Plug US Gen4** | Dell power draw monitoring (W, V, A, kWh) — fully local | ~$20 | [Shelly USA](https://us.shelly.com/products/shelly-plug-us-gen4-black), Amazon | In stock |
| **Ethernet cable (Cat6)** | Wired connection Pi → router (more reliable than Wi-Fi for always-on) | ~$5 | Any | In stock |

**Subtotal: ~$175-200**

### No Subscriptions Required

The Powerwall's local Backup Gateway exposes a REST API on the LAN — no cloud service needed. Home Assistant's native [Tesla Powerwall integration](https://www.home-assistant.io/integrations/powerwall/) reads directly from this local API, providing solar production, battery state of charge, grid import/export, and home load — everything the Sun-Grace and Lunar automations need.

> **Confirmed: Powerwall 2.** The local Gateway API is well-established and fully supported on PW2. The Backup Gateway exposes REST endpoints on the LAN at its local IP. No cloud dependency, no subscription, no external network calls — perfectly aligned with Tier 1 sovereignty.

### Finding Your Powerwall Gateway and Accessing Its Data

The Tesla Energy Gateway (TEG) is a grey box mounted near your electrical panel — separate from the Powerwall battery itself. It has its own Wi-Fi and Ethernet connection to your home network. Here's how to find it and verify the API works.

#### Step 1: Find the Gateway's IP Address

Try these methods in order (easiest first):

**Method A — Router admin page (most reliable):**
1. Open your router's admin page (typically `192.168.1.1` or `192.168.4.1` — check the sticker on your router)
2. Look for a "Connected Devices" or "DHCP Clients" list
3. Search for a device named `TEG`, `TeslaEnergyGateway`, or `Tesla` — that's the Gateway
4. Note its IP address (e.g., `192.168.4.50`)

**Method B — Network scan from your Mac:**
```bash
# Scan your local network for devices with open HTTPS ports (the Gateway runs on 443)
# Replace 192.168.4.0 with your actual subnet
nmap -p 443 --open 192.168.4.0/24

# Or use arp to list all devices, then try each IP
arp -a
```

**Method C — mDNS discovery:**
```bash
# The Gateway may advertise itself via mDNS
dns-sd -B _http._tcp local.
```

**Method D — Tesla app (limited):**
The Tesla app doesn't directly show the Gateway IP, but under **Powerwall → Settings → Gateway Wi-Fi**, you can see network details that may help identify it on your router's device list.

#### Step 2: Access the Gateway Web Interface

Once you have the IP, open it in a browser:

```
https://<GATEWAY_IP>/
```

You'll get a certificate warning (the Gateway uses a self-signed cert) — that's expected. Click through to proceed.

**Login credentials:**
- **Email:** Your Tesla account email
- **Password:** The last 5 characters of your Gateway serial number (found on the physical Gateway unit or your Tesla app under Powerwall → Gateway). If you've changed it, use your custom password.

#### Step 3: Verify the API Returns Solar Data

From your Mac terminal, test the key endpoints. Replace `<GATEWAY_IP>` and `<PASSWORD>` with your values:

```bash
# Get an auth token (store it for subsequent requests)
TOKEN=$(curl -s -k -X POST https://<GATEWAY_IP>/api/login/Basic \
  -H "Content-Type: application/json" \
  -d '{"username":"customer","password":"<PASSWORD>","email":"your@email.com"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['token'])")

echo "Token: $TOKEN"

# Solar production, grid, battery, and home load — the main endpoint
curl -s -k -H "Authorization: Bearer $TOKEN" \
  https://<GATEWAY_IP>/api/meters/aggregates | python3 -m json.tool

# Battery state of charge (percentage)
curl -s -k -H "Authorization: Bearer $TOKEN" \
  https://<GATEWAY_IP>/api/system_status/soe | python3 -m json.tool
```

**What you should see from `/api/meters/aggregates`:**

A JSON response with sections for `site` (grid), `battery`, `load` (home), and `solar`. The key field is:

```json
{
  "solar": {
    "instant_power": 4523.5,  ← Current solar production in watts
    ...
  },
  "battery": {
    "instant_power": -1200.0, ← Negative = charging, positive = discharging
    ...
  }
}
```

**What you should see from `/api/system_status/soe`:**

```json
{
  "percentage": 87.3  ← Battery charge level (this is what Sun-Grace checks)
}
```

If you see real numbers here, your Gateway is accessible and the API works. This is exactly what Home Assistant will read.

#### Step 4: Configure in Home Assistant

Once you have the Gateway IP and credentials confirmed, adding it to Home Assistant is straightforward:

1. Go to **Settings → Devices & Services → Add Integration**
2. Search for **Tesla Powerwall**
3. Enter the Gateway IP address and your credentials
4. HA will auto-discover all available sensors (solar power, battery %, grid status, etc.)

The sensors will appear as entities like `sensor.powerwall_solar_power`, `sensor.powerwall_battery_charge`, etc. — exactly what the Sun-Grace and Lunar automations reference.

#### Troubleshooting

| Problem | Solution |
|---|---|
| Can't find Gateway on network | Check that the Gateway is connected via Ethernet (preferred) or Wi-Fi. It may be on a different subnet if your home has multiple networks. |
| Certificate error in browser | Expected — the Gateway uses a self-signed cert. Use `-k` flag with curl, or click through the browser warning. |
| Authentication fails | Try the last 5 characters of the serial number (no spaces, case-sensitive). If that doesn't work, you may need to reset the Gateway password via the Tesla app or by contacting Tesla support. |
| API returns empty or stale data | The Gateway may need a reboot. Flip the breaker for the Gateway briefly (30 seconds), then let it reconnect. |
| `/api/login/Basic` returns 403 | Some newer firmware versions changed auth. Try the endpoint `/api/login` without `/Basic`. |

### Not Required (Deferred)

| Component | Why deferred | Revisit when |
|---|---|---|
| **Raspberry Pi AI HAT+ 2 ($130)** | LLM benchmarks are underwhelming (~6.5-9.5 tok/s on 1.5B models). The Pi's role should be orchestration, not inference. | Revisit if Tier 2 nighttime inference becomes a real user need |
| **NVIDIA Jetson Orin Nano Super ($249)** | Best option for always-on LLM inference (~40-55 tok/s on 1.5B) but adds complexity. Not needed until community usage demands nighttime AI availability. | Revisit in Phase 4 when community access is live |
| **Z-Wave USB stick + Zooz ZEN15 (~$70-80 total)** | Alternative to Shelly for power monitoring. Better form factor (inline cord) but requires Z-Wave infrastructure. | Only if Shelly doesn't meet needs |

---

## Dell XPS 8950 Configuration

The Dell must be configured for reliable Wake-on-LAN from S3 sleep.

### BIOS Settings (press F2 at Dell splash screen)

- **Power Management → Wake on LAN:** Enable
- **Power Management → Deep Sleep Control:** **DISABLE** (this is the #1 reason WoL fails on Dell systems — it's enabled by default)
- **Power Management → AC Recovery:** Set to "Last Power State" (so the Dell recovers correctly after a power outage)

### Ubuntu Configuration

```bash
# Install ethtool to configure WoL on the network interface
sudo apt install ethtool

# Find the ethernet interface name (likely enp3s0 or similar)
ip link show

# Enable WoL on the interface (replace enp3s0 with your interface)
sudo ethtool -s enp3s0 wol g

# Make it persistent across reboots — create a systemd service
sudo tee /etc/systemd/system/wol.service << 'EOF'
[Unit]
Description=Enable Wake-on-LAN
After=network.target

[Service]
Type=oneshot
ExecStart=/usr/sbin/ethtool -s enp3s0 wol g

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable wol.service
```

### Sleep/Suspend Configuration

```bash
# Test suspend works
sudo systemctl suspend

# The Pi will wake the Dell via WoL — verify it comes back
# from another machine on the network:
wakeonlan AA:BB:CC:DD:EE:FF  # Replace with Dell's MAC address
```

### Important Limitation

**WoL only works from S3 (sleep), not S5 (full shutdown).** This is a Dell hardware/firmware limitation. The Dell must be configured to sleep, never shut down. S3 sleep draws only ~3W, which is negligible in a solar-powered system.

If the Dell loses power entirely (Powerwall depleted, grid outage), it will need to be manually powered on once power is restored — unless "AC Recovery → Last Power State" is set in BIOS, which will auto-boot it after power returns.

---

## Raspberry Pi 5 Setup

### Operating System

Install **Home Assistant OS** (not Home Assistant Container or Core). HAOS gives you:
- Managed OS updates
- Add-on store (for SSH, Tailscale, MQTT, etc.)
- Backup and restore built in
- Supervisor for managing integrations

**Installation:** Flash HAOS to the NVMe SSD using [Raspberry Pi Imager](https://www.raspberrypi.com/software/), boot the Pi, and access the web UI at `http://homeassistant.local:8123`.

### Required Integrations

| Integration | Purpose | Setup |
|---|---|---|
| **[Tesla Powerwall](https://www.home-assistant.io/integrations/powerwall/)** | Solar production, battery %, grid status — via local Gateway API | Enter Gateway IP and credentials in HA. No cloud account needed. |
| **Shelly** | Dell power monitoring | Auto-discovered on network. Native HA integration. |
| **Wake on LAN** | Send magic packets to Dell | Native HA integration. Configure with Dell's MAC address. |
| **Sun** | Sunrise/sunset times for automation triggers | Built into HA by default (uses your location) |

### Optional Integrations

| Integration | Purpose |
|---|---|
| **Tailscale** | Access HA dashboard remotely via encrypted mesh (same network as the Dell) |
| **MQTT** | If using Shelly in MQTT mode instead of HTTP (either works) |
| **InfluxDB + Grafana** | Long-term energy data storage and advanced dashboards (beyond HA's built-in Energy Dashboard) |
| **Teslemetry (~$2.50/mo)** | Only needed if you want to *control* the Powerwall (change reserve %, switch modes) or if the local Gateway API doesn't work on your firmware. Not required for read-only monitoring. |

---

## Home Assistant Automations

### Sun-Grace Protocol (Wake Dell)

```yaml
alias: "Sun-Grace: Wake Sovereign Node"
description: "Wake the Dell when solar surplus is detected"
trigger:
  - platform: numeric_state
    entity_id: sensor.powerwall_solar_power  # from local Gateway API
    above: 2500  # watts
    for:
      minutes: 5  # sustained, not a spike
condition:
  - condition: numeric_state
    entity_id: sensor.powerwall_battery_charge  # from local Gateway API
    above: 80  # percent
  - condition: sun
    after: sunrise
    before: sunset
    before_offset: "-02:00:00"  # 2 hours before sunset buffer
  - condition: numeric_state
    entity_id: sensor.shelly_plug_dell_power  # from Shelly
    below: 10  # Dell is currently sleeping (< 10W)
action:
  - service: wake_on_lan.send_magic_packet
    data:
      mac: "AA:BB:CC:DD:EE:FF"  # Replace with Dell MAC
  - delay:
      seconds: 60
  - if:
      - condition: numeric_state
        entity_id: sensor.shelly_plug_dell_power
        above: 50  # Dell has woken up (drawing > 50W)
    then:
      - service: input_select.select_option
        target:
          entity_id: input_select.sovereignty_tier
        data:
          option: "Tier 1 - Full Sovereignty"
    else:
      # Retry once
      - service: wake_on_lan.send_magic_packet
        data:
          mac: "AA:BB:CC:DD:EE:FF"
      - service: notify.notify
        data:
          message: "Sun-Grace: Dell failed to wake after WoL. Retrying."
```

### Lunar Protocol (Sleep Dell)

```yaml
alias: "Lunar: Sleep Sovereign Node"
description: "Put the Dell to sleep when solar is low or battery needed"
trigger:
  - platform: numeric_state
    entity_id: sensor.powerwall_solar_power
    below: 500  # watts
    for:
      minutes: 15
  - platform: numeric_state
    entity_id: sensor.powerwall_battery_charge
    below: 40
  - platform: sun
    event: sunset
    offset: "00:30:00"  # 30 min after sunset
condition:
  - condition: numeric_state
    entity_id: sensor.shelly_plug_dell_power
    above: 50  # Dell is currently awake
action:
  - service: shell_command.sleep_dell
  - delay:
      seconds: 30
  - if:
      - condition: numeric_state
        entity_id: sensor.shelly_plug_dell_power
        below: 10  # Dell has gone to sleep
    then:
      - service: input_select.select_option
        target:
          entity_id: input_select.sovereignty_tier
        data:
          option: "Tier 2 - Reduced Capability"
    else:
      - service: notify.notify
        data:
          message: "Lunar: Dell did not enter sleep. Manual intervention may be needed."
```

### Shell Command (for SSH suspend)

```yaml
# In configuration.yaml
shell_command:
  sleep_dell: "ssh -o StrictHostKeyChecking=no sage-node 'sudo systemctl suspend'"
```

> **Note:** The Pi must have SSH key access to the Dell. Generate a key pair on the Pi and add the public key to the Dell's `~/.ssh/authorized_keys`. This is a one-time setup step.

---

## Energy Dashboard

Home Assistant's built-in **Energy Dashboard** provides:

- **Solar production** (from Powerwall local API) — daily/weekly/monthly generation
- **Battery charge/discharge cycles** (from Powerwall local API) — how the Powerwall is being used
- **Dell power consumption** (from Shelly) — real-time and cumulative kWh
- **Grid import/export** (from Powerwall local API) — net energy balance

This dashboard answers the question the Sage AI Constitution demands: *"How much energy did this intelligence consume, and where did it come from?"*

### Custom Dashboard Cards (Recommended)

Beyond the built-in Energy Dashboard, create a dedicated "Sovereign Node" dashboard with:

- **Current state indicator:** Tier 1 / Tier 2 / Sleeping (driven by `input_select.sovereignty_tier`)
- **Dell power gauge:** Real-time wattage from Shelly (0-600W range)
- **Solar surplus gauge:** Current solar production minus home consumption
- **Battery level:** Powerwall charge percentage
- **Today's AI energy:** kWh consumed by the Dell today (from Shelly)
- **Wake/sleep log:** History of Sun-Grace and Lunar Protocol triggers

---

## Sovereignty Tier Mapping

This power system implements the Sovereignty Tiers defined in [INCEPTION.md](./INCEPTION.md):

| State | Tier | Power Draw | AI Capability | User Experience |
|---|---|---|---|---|
| **Sun-Grace** (Dell awake) | Tier 1 — Full Sovereignty | ~80-500W (Dell) + ~5W (Pi) | Full Apertus 8B + 70B | Complete AI access, fast responses |
| **Lunar** (Dell sleeping) | Tier 2 — Reduced Capability | ~3W (Dell S3) + ~5W (Pi) | Queries queued for sunrise | "Sage is in low-power mode. Your request will be answered at sunrise." |
| **Cloud-Assisted** (user opt-in) | Tier 3 — Sovereignty Suspended | N/A (external) | External API (Anthropic, etc.) | Per-request consent required. Prompt leaves local network. |

Tier 3 is **never triggered by this power system**. It is always a user-initiated, per-request decision. The power system only manages the transition between Tier 1 and Tier 2.

---

## Safety and Failure Modes

| Failure | Response |
|---|---|
| **Pi loses power** | Dell stays in whatever state it was in (awake or sleeping). No automation until Pi recovers. Pi should be on a UPS or the Powerwall-backed circuit. |
| **Dell fails to wake** (WoL packet lost) | Automation retries once after 60 seconds, then sends notification. Manual intervention required if second attempt fails. |
| **Dell fails to sleep** (SSH command fails) | Notification sent. Dell continues running but is not being actively managed. Check SSH connectivity. |
| **Shelly loses Wi-Fi** | Power monitoring goes dark but Dell continues operating. Automations that depend on Shelly power readings will not trigger until reconnected. |
| **Powerwall Gateway unreachable** | Solar/battery data stops updating. Automations fall back to time-based triggers (sunrise/sunset from the Sun integration) as a degraded mode. Since the Gateway is on the LAN, this likely means a network issue, not a cloud outage. |
| **Grid outage + Powerwall depleted** | Everything powers off. After power returns, Pi auto-boots (HAOS default). Dell auto-boots if "AC Recovery → Last Power State" is set in BIOS. Automations resume. |

---

## Future Considerations

### Tier 2 Nighttime Inference (Deferred)

The INCEPTION.md envisions a small LLM running on the Pi for nighttime queries. Current benchmarks show this is not yet practical:

- **AI HAT+ 2 (Hailo-10H):** ~6.5-9.5 tok/s on 1.5B models. Usable for simple queries but not conversational AI. $130 additional cost.
- **Pi 5 CPU (no HAT):** ~9 tok/s on 1.5B — surprisingly competitive with the HAT.
- **Jetson Orin Nano Super:** ~40-55 tok/s on 1.5B, ~28 tok/s on 3B. Vastly better but $249 and a separate device to manage.

**Current recommendation:** Queue nighttime queries for sunrise rather than providing degraded inference. Revisit when either (a) community usage shows demand for nighttime AI, or (b) edge inference hardware improves.

### Garage Deployment

When the Dell moves to the garage for headless operation:

- Ensure Ethernet reaches the garage (or use a powerline adapter / MoCA bridge)
- Consider a small UPS (~$50-80) for the Pi to survive brief power blips
- Temperature monitoring may be needed depending on garage climate (HA can monitor via Pi's built-in temp sensor or an additional sensor)
- The Shelly plug travels with the Dell — it's inline with the power cable

### Energy Cost Tracking

Once the Energy Dashboard is running with both solar and Dell consumption data, you can calculate:

- **Cost per inference:** kWh consumed by Dell during an AI session / number of completions
- **Solar offset percentage:** What fraction of AI energy came from solar vs. grid
- **Daily/monthly AI energy budget:** Track whether AI usage stays within solar surplus

This data is not just operational — it's part of the Sage AI story. The Ecological Awareness constitutional mandate requires the system to report its own energy footprint honestly.

---

## Implementation Checklist

> Detailed task tracking is in [sage-ai-todo.md](./sage-ai-todo.md) under Phase 2.

1. Order hardware (Pi 5 8GB, case, PSU, NVMe HAT + SSD, Shelly Plug US Gen4)
2. Find your Powerwall Gateway IP and verify `/api/meters/aggregates` returns solar data
3. Flash Home Assistant OS to NVMe SSD, boot Pi
4. Configure Dell BIOS (WoL enabled, Deep Sleep disabled, AC Recovery)
5. Configure Dell Ubuntu (ethtool WoL, SSH key for Pi)
6. Install Shelly plug inline with Dell power cable
7. Configure HA integrations (Powerwall local, Shelly, WoL, Sun)
8. Build Sun-Grace and Lunar automations
9. Build Energy Dashboard
10. Test full cycle: Sun-Grace wake → AI workload → Lunar sleep → overnight queue → sunrise wake
11. Move Dell to garage (headless)
