/**
 * Ready-made shapes for Splunk Attack Range in the cloud, one set per provider, mirroring the template library of the
 * detection-platform project (splunk_minimal_aws, splunk_ad_azure, ...). Each preset is just a bundle of the engine's
 * own options, so "Create custom" is the same thing with the knobs exposed.
 */
export const PROVIDERS = ["aws", "azure", "gcp"];

/** Instance types upstream's Terraform uses per role and provider, with rough on-demand prices (USD/hour) for the summary only. */
export const INSTANCES = {
  aws: { splunk: { type: "t3.2xlarge", usdPerHour: 0.33 }, windows: { type: "t3.xlarge", usdPerHour: 0.35 }, linux: { type: "t3.xlarge", usdPerHour: 0.17 },
    kali: { type: "t3.large", usdPerHour: 0.08 }, zeek: { type: "m5.2xlarge", usdPerHour: 0.38 }, soar: { type: "t3.xlarge", usdPerHour: 0.17 } },
  azure: { splunk: { type: "Standard_D4_v4", usdPerHour: 0.19 }, windows: { type: "Standard_D4_v4", usdPerHour: 0.38 }, linux: { type: "Standard_A4_v2", usdPerHour: 0.19 },
    kali: { type: "Standard_D4_v4", usdPerHour: 0.19 }, soar: { type: "Standard_A4_v2", usdPerHour: 0.19 } },
  gcp: { splunk: { type: "e2-standard-4", usdPerHour: 0.13 }, windows: { type: "n2-standard-4", usdPerHour: 0.38 }, linux: { type: "n2-standard-4", usdPerHour: 0.19 },
    kali: { type: "e2-standard-2", usdPerHour: 0.07 }, zeek: { type: "e2-standard-4", usdPerHour: 0.13 }, soar: { type: "e2-standard-4", usdPerHour: 0.13 } },
};

/** Which optional servers each provider's Terraform has a module for. */
export const SUPPORTS = { aws: ["kali", "zeek", "soar"], azure: ["kali", "soar"], gcp: ["kali", "zeek", "soar"] };

const shape = (id, name, description, servers, options) => ({ id, name, description, servers, options });
const base = (p) => [
  shape(`splunk_minimal_${p}`, "Minimal", `Minimal ${P(p)} deployment with a Splunk server only`, ["splunk"], { windows: 0 }),
  shape(`splunk_windows_${p}`, "Splunk + Windows", `${P(p)} deployment with Splunk and a Windows endpoint for testing Windows-based attacks`, ["splunk", "win"], { windows: 1 }),
  shape(`splunk_linux_${p}`, "Splunk + Linux", `${P(p)} deployment with Splunk and a Linux endpoint for testing Linux-based attacks`, ["splunk", "linux"], { windows: 0, linux: 1 }),
  shape(`splunk_ad_${p}`, "Active Directory", `${P(p)} deployment with Splunk, a Windows Active Directory domain controller and a domain-joined Windows endpoint`, ["splunk", "win-dc", "win"], { windows: 2, createDomain: true }),
  shape(`splunk_es_${p}`, "Enterprise Security", `${P(p)} deployment with the Splunk Enterprise Security app for advanced security analytics (needs your ES package)`, ["splunk"], { windows: 0, installEs: true }),
];
function P(p) { return { aws: "AWS", azure: "Azure", gcp: "GCP" }[p]; }

export const PRESETS = {
  aws: [
    ...base("aws"),
    shape("splunk_windows_kali_aws", "Windows + Kali", "AWS deployment with Splunk, a Windows endpoint and a Kali attacker box", ["splunk", "win", "kali"], { windows: 1, kali: true }),
    shape("splunk_zeek_windows_aws", "Zeek + Windows", "AWS deployment with Splunk, Zeek network monitoring and a Windows endpoint monitored by Zeek", ["splunk", "zeek", "win"], { windows: 1, zeek: true }),
    shape("splunk_soar_aws", "Splunk SOAR", "AWS deployment with Splunk and Splunk SOAR (Phantom)", ["splunk", "soar"], { windows: 0, soar: true }),
  ],
  azure: [
    ...base("azure"),
    shape("splunk_full_azure", "Full", "Full Azure deployment with Splunk, a Linux endpoint and a Windows endpoint for comprehensive testing", ["splunk", "linux", "win"], { windows: 1, linux: 1 }),
  ],
  gcp: [
    ...base("gcp"),
    shape("splunk_zeek_windows_gcp", "Zeek + Windows", "GCP deployment with Splunk, Zeek network monitoring and a Windows endpoint monitored by Zeek", ["splunk", "zeek", "win"], { windows: 1, zeek: true }),
  ],
};

export function findPreset(id) {
  for (const p of PROVIDERS) { const hit = PRESETS[p].find((x) => x.id === id); if (hit) return { ...hit, provider: p }; }
  return null;
}

/** The presets as the control plane stores them: compact, provider-tagged, with the server summary the cards show. */
export function presetCatalog() {
  return PROVIDERS.flatMap((p) => PRESETS[p].map((x) => ({ id: x.id, provider: p, name: x.name, description: x.description, servers: x.servers, options: x.options })));
}
