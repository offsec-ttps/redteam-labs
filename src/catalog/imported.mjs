/**
 * GENERATED — do not edit by hand.
 *   node scripts/import-docx-catalog.mjs --docx <Detection_Engineering_Lab_Catalog.docx>
 *
 * Imported from the research catalog (Detection_Engineering_Lab_Catalog.docx).
 * 187 labs across 12 domains:
 * ad=21 · cicd=17 · cloud=15 · iac=12 · identity=13 · k8s=17 · linux=12 · llm=20 · mobile=10 · network=19 · ot=12 · web=19
 *
 * Every entry is deploy.available:false — catalogued with its upstream repo, not
 * verified as deployable. Curated entries in labs.mjs override these by id.
 */

export const IMPORTED_LABS = [
  {
    "id": "automatedlab",
    "name": "AutomatedLab",
    "domain": "ad",
    "description": "AutomatedLab — vulnerable lab catalogued from the research set (Local/Hyper-V/Azure).",
    "repo": "https://github.com/AutomatedLab/AutomatedLab",
    "docsUrl": "https://github.com/AutomatedLab/AutomatedLab",
    "engine": "vm",
    "environments": [
      "cloud",
      "local"
    ],
    "provider": "azure",
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "azure-sentinel-lab",
    "name": "Azure Sentinel Lab",
    "domain": "ad",
    "description": "Azure Sentinel Lab — vulnerable lab catalogued from the research set (Cloud (Azure)).",
    "repo": "https://github.com/Azure/Azure-Sentinel",
    "docsUrl": "https://github.com/Azure/Azure-Sentinel",
    "engine": "terraform",
    "environments": [
      "cloud"
    ],
    "provider": "azure",
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "blackhills-ad-lab",
    "name": "BlackHills AD Lab",
    "domain": "ad",
    "description": "BlackHills AD Lab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/blackhillsinfosec/BlackHills-AD-Lab",
    "docsUrl": "https://github.com/blackhillsinfosec/BlackHills-AD-Lab",
    "engine": "vm",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "daft",
    "name": "DAFT",
    "domain": "ad",
    "description": "DAFT — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/SecurityRiskAdvisors/DAFT",
    "docsUrl": "https://github.com/SecurityRiskAdvisors/DAFT",
    "engine": "vm",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "detectionlab",
    "name": "DetectionLab",
    "domain": "ad",
    "description": "DetectionLab — vulnerable lab catalogued from the research set (Local (Vagrant) + AWS).",
    "repo": "https://github.com/clong/DetectionLab",
    "docsUrl": "https://github.com/clong/DetectionLab",
    "engine": "vm",
    "environments": [
      "cloud",
      "local"
    ],
    "provider": "aws",
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "elastic-detection-lab",
    "name": "Elastic Detection Lab",
    "domain": "ad",
    "description": "Elastic Detection Lab — vulnerable lab catalogued from the research set (Local/Cloud).",
    "repo": "https://github.com/elastic/detection-rules-testing",
    "docsUrl": "https://github.com/elastic/detection-rules-testing",
    "engine": "vm",
    "environments": [
      "cloud",
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "goad",
    "name": "GOAD",
    "domain": "ad",
    "description": "GOAD — vulnerable lab catalogued from the research set (Local (Vagrant/Proxmox/Azure)).",
    "repo": "https://github.com/Orange-Cyberdefense/GOAD",
    "docsUrl": "https://github.com/Orange-Cyberdefense/GOAD",
    "engine": "vm",
    "environments": [
      "cloud",
      "local"
    ],
    "provider": "azure",
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": [
        "T1003",
        "T1068",
        "T1071",
        "T1486",
        "T1485",
        "T1055",
        "T1136"
      ]
    },
    "sigmaPath": "windows/, ad/",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "goad-light",
    "name": "GOAD-Light",
    "domain": "ad",
    "description": "GOAD-Light — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/Orange-Cyberdefense/GOAD/tree/main/goad-light",
    "docsUrl": "https://github.com/Orange-Cyberdefense/GOAD/tree/main/goad-light",
    "engine": "vm",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "hackthebox-pro-labs",
    "name": "HackTheBox Pro Labs",
    "domain": "ad",
    "description": "HackTheBox Pro Labs — vulnerable lab catalogued from the research set (Cloud).",
    "repo": "https://www.hackthebox.com/hacker/pro-labs",
    "docsUrl": "https://www.hackthebox.com/hacker/pro-labs",
    "engine": "terraform",
    "environments": [
      "cloud"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "invoke-adlabdeployer",
    "name": "Invoke-ADLabDeployer",
    "domain": "ad",
    "description": "Invoke-ADLabDeployer — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/ChrisPineapple/Invoke-ADLabDeployer",
    "docsUrl": "https://github.com/ChrisPineapple/Invoke-ADLabDeployer",
    "engine": "vm",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "king-of-the-hill",
    "name": "King of the Hill",
    "domain": "ad",
    "description": "King of the Hill — vulnerable lab catalogued from the research set (Local/Cloud).",
    "repo": "https://github.com/KingOfTheHillLab/KotH",
    "docsUrl": "https://github.com/KingOfTheHillLab/KotH",
    "engine": "vm",
    "environments": [
      "cloud",
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "labbuilder",
    "name": "LabBuilder",
    "domain": "ad",
    "description": "LabBuilder — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/PlagueHO/LabBuilder",
    "docsUrl": "https://github.com/PlagueHO/LabBuilder",
    "engine": "vm",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "malware-lab",
    "name": "Malware Lab",
    "domain": "ad",
    "description": "Malware Lab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/cmdlab/malware-lab",
    "docsUrl": "https://github.com/cmdlab/malware-lab",
    "engine": "vm",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "poshc2-lab",
    "name": "PoshC2 Lab",
    "domain": "ad",
    "description": "PoshC2 Lab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/PoshC2/PoshC2",
    "docsUrl": "https://github.com/PoshC2/PoshC2",
    "engine": "vm",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "purple-knight-semperis",
    "name": "Purple Knight (Semperis)",
    "domain": "ad",
    "description": "Purple Knight (Semperis) — vulnerable lab catalogued from the research set (Local/Cloud).",
    "repo": "https://www.purpleknight.com/",
    "docsUrl": "https://www.purpleknight.com/",
    "engine": "vm",
    "environments": [
      "cloud",
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "soc-fortress",
    "name": "SOC Fortress",
    "domain": "ad",
    "description": "SOC Fortress — vulnerable lab catalogued from the research set (Local/Cloud).",
    "repo": "https://github.com/CyberDefenders/soc-fortress",
    "docsUrl": "https://github.com/CyberDefenders/soc-fortress",
    "engine": "vm",
    "environments": [
      "cloud",
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "splunk-attack-range",
    "name": "Splunk Attack Range",
    "domain": "ad",
    "description": "Splunk Attack Range — vulnerable lab catalogued from the research set (Local/AWS/Azure).",
    "repo": "https://github.com/splunk/attack_range",
    "docsUrl": "https://github.com/splunk/attack_range",
    "engine": "vm",
    "environments": [
      "cloud",
      "local"
    ],
    "provider": "aws",
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "tcm-peh-lab",
    "name": "TCM PEH Lab",
    "domain": "ad",
    "description": "TCM PEH Lab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/TCM-Course/Lab",
    "docsUrl": "https://github.com/TCM-Course/Lab",
    "engine": "vm",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "vulnad",
    "name": "VulnAD",
    "domain": "ad",
    "description": "VulnAD — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/MyStuffExplore/VulnAD",
    "docsUrl": "https://github.com/MyStuffExplore/VulnAD",
    "engine": "vm",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "vulnerable-ad",
    "name": "Vulnerable AD",
    "domain": "ad",
    "description": "Vulnerable AD — vulnerable lab catalogued from the research set (Local (PowerShell)).",
    "repo": "https://github.com/sonySMB/vulnerable-AD",
    "docsUrl": "https://github.com/sonySMB/vulnerable-AD",
    "engine": "vm",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "winpilot",
    "name": "WinPilot",
    "domain": "ad",
    "description": "WinPilot — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/OTRF/WinPilot",
    "docsUrl": "https://github.com/OTRF/WinPilot",
    "engine": "vm",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "argo-goat",
    "name": "Argo Goat",
    "domain": "cicd",
    "description": "Argo Goat — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/step-security/argo-goat",
    "docsUrl": "https://github.com/step-security/argo-goat",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "ci-tests-chainguard",
    "name": "CI Tests (Chainguard)",
    "domain": "cicd",
    "description": "CI Tests (Chainguard) — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/chainguard-dev/ci-tests",
    "docsUrl": "https://github.com/chainguard-dev/ci-tests",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "ci-cd-goat-cider-security",
    "name": "CI/CD Goat (Cider Security)",
    "domain": "cicd",
    "description": "CI/CD Goat (Cider Security) — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/cider-security-research/cicd-goat",
    "docsUrl": "https://github.com/cider-security-research/cicd-goat",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "cncf-supply-chain-lab",
    "name": "CNCF Supply Chain Lab",
    "domain": "cicd",
    "description": "CNCF Supply Chain Lab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/cncf/tag-security",
    "docsUrl": "https://github.com/cncf/tag-security",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "dependency-track-demo",
    "name": "Dependency-Track Demo",
    "domain": "cicd",
    "description": "Dependency-Track Demo — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/DependencyTrack/dependency-track",
    "docsUrl": "https://github.com/DependencyTrack/dependency-track",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "gitlab-cicd-goat",
    "name": "GitLab CICD Goat",
    "domain": "cicd",
    "description": "GitLab CICD Goat — vulnerable lab catalogued from the research set (Cloud).",
    "repo": "https://github.com/step-security/gitlab-goat",
    "docsUrl": "https://github.com/step-security/gitlab-goat",
    "engine": "terraform",
    "environments": [
      "cloud"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "grype-lab",
    "name": "Grype Lab",
    "domain": "cicd",
    "description": "Grype Lab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/anchore/grype",
    "docsUrl": "https://github.com/anchore/grype",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "helmgoat",
    "name": "HelmGoat",
    "domain": "cicd",
    "description": "HelmGoat — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/bridgecrewio/helm-goat",
    "docsUrl": "https://github.com/bridgecrewio/helm-goat",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "jenkins-goat",
    "name": "Jenkins Goat",
    "domain": "cicd",
    "description": "Jenkins Goat — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/step-security/jenkins-goat",
    "docsUrl": "https://github.com/step-security/jenkins-goat",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "osv-scanner-tests",
    "name": "OSV-Scanner Tests",
    "domain": "cicd",
    "description": "OSV-Scanner Tests — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/google/osv-scanner",
    "docsUrl": "https://github.com/google/osv-scanner",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "sbom-lab-anchore",
    "name": "SBOM Lab (Anchore)",
    "domain": "cicd",
    "description": "SBOM Lab (Anchore) — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/anchore/sbom-lab",
    "docsUrl": "https://github.com/anchore/sbom-lab",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "secure-workflows",
    "name": "Secure Workflows",
    "domain": "cicd",
    "description": "Secure Workflows — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/step-security/secure-workflows",
    "docsUrl": "https://github.com/step-security/secure-workflows",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "sigstore-playground",
    "name": "Sigstore Playground",
    "domain": "cicd",
    "description": "Sigstore Playground — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/sigstore/community-playground",
    "docsUrl": "https://github.com/sigstore/community-playground",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "slsa-playground",
    "name": "SLSA Playground",
    "domain": "cicd",
    "description": "SLSA Playground — vulnerable lab catalogued from the research set (Cloud).",
    "repo": "https://slsa.dev/",
    "docsUrl": "https://slsa.dev/",
    "engine": "terraform",
    "environments": [
      "cloud"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "syft-lab",
    "name": "Syft Lab",
    "domain": "cicd",
    "description": "Syft Lab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/anchore/syft",
    "docsUrl": "https://github.com/anchore/syft",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "tekton-goat",
    "name": "Tekton Goat",
    "domain": "cicd",
    "description": "Tekton Goat — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/step-security/tekton-goat",
    "docsUrl": "https://github.com/step-security/tekton-goat",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "trivy-vuln-lab",
    "name": "Trivy Vuln Lab",
    "domain": "cicd",
    "description": "Trivy Vuln Lab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/aquasecurity/trivy",
    "docsUrl": "https://github.com/aquasecurity/trivy",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "awsgoat",
    "name": "AWSGoat",
    "domain": "cloud",
    "description": "Tiered AWS vulnerabilities",
    "repo": "https://github.com/ine-labs/AWSGoat",
    "docsUrl": "https://github.com/ine-labs/AWSGoat",
    "engine": "terraform",
    "environments": [
      "cloud"
    ],
    "provider": "aws",
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [
        "TA0006",
        "TA0009",
        "TA0001"
      ],
      "techniques": []
    },
    "sigmaPath": "cloud/aws/",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "azuregoat",
    "name": "AzureGoat",
    "domain": "cloud",
    "description": "Tiered Azure vulnerabilities",
    "repo": "https://github.com/ine-labs/AzureGoat",
    "docsUrl": "https://github.com/ine-labs/AzureGoat",
    "engine": "terraform",
    "environments": [
      "cloud"
    ],
    "provider": "azure",
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [
        "TA0004"
      ],
      "techniques": []
    },
    "sigmaPath": "cloud/azure/",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "ci-cd-goat",
    "name": "CI/CD Goat",
    "domain": "cloud",
    "description": "Jenkins + GitLab + Argo",
    "repo": "https://github.com/cider-security-research/cicd-goat",
    "docsUrl": "https://github.com/cider-security-research/cicd-goat",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": [
        "T1195",
        "T1059.004"
      ]
    },
    "sigmaPath": "devops/",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "cloudfoxable",
    "name": "CloudFoxable",
    "domain": "cloud",
    "description": "Intentionally vulnerable env for CloudFox",
    "repo": "https://github.com/BishopFox/cloudfoxable",
    "docsUrl": "https://github.com/BishopFox/cloudfoxable",
    "engine": "terraform",
    "environments": [
      "cloud"
    ],
    "provider": "aws",
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "cloudgoat",
    "name": "CloudGoat",
    "domain": "cloud",
    "description": "Scenario-based pentest",
    "repo": "https://github.com/RhinoSecurityLabs/cloudgoat",
    "docsUrl": "https://github.com/RhinoSecurityLabs/cloudgoat",
    "engine": "terraform",
    "environments": [
      "cloud"
    ],
    "provider": "aws",
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "cloudseclist-labs",
    "name": "CloudSecList Labs",
    "domain": "cloud",
    "description": "Misc. cloud misconfigurations",
    "repo": "https://github.com/cloudseclabs",
    "docsUrl": "https://github.com/cloudseclabs",
    "engine": "terraform",
    "environments": [
      "cloud"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "dvca",
    "name": "DVCA",
    "domain": "cloud",
    "description": "Damn Vulnerable Cloud App",
    "repo": "https://github.com/haerinia/DVCA",
    "docsUrl": "https://github.com/haerinia/DVCA",
    "engine": "terraform",
    "environments": [
      "cloud"
    ],
    "provider": "aws",
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "eks-goat-owasp",
    "name": "EKS Goat (OWASP)",
    "domain": "cloud",
    "description": "Vulnerable EKS clusters",
    "repo": "https://github.com/OWASP/www-project-eks-goat",
    "docsUrl": "https://github.com/OWASP/www-project-eks-goat",
    "engine": "terraform",
    "environments": [
      "cloud"
    ],
    "provider": "aws",
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "entragoat",
    "name": "EntraGoat",
    "domain": "cloud",
    "description": "Microsoft 365/Entra ID vulns",
    "repo": "https://github.com/Semperis/EntraGoat",
    "docsUrl": "https://github.com/Semperis/EntraGoat",
    "engine": "terraform",
    "environments": [
      "cloud"
    ],
    "provider": "azure",
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [
        "TA0004"
      ],
      "techniques": [
        "T1098"
      ]
    },
    "sigmaPath": "cloud/azure/identity",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "gcpgoat",
    "name": "GCPGoat",
    "domain": "cloud",
    "description": "Tiered GCP vulnerabilities",
    "repo": "https://github.com/ine-labs/GCPGoat",
    "docsUrl": "https://github.com/ine-labs/GCPGoat",
    "engine": "terraform",
    "environments": [
      "cloud"
    ],
    "provider": "gcp",
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [
        "TA0008",
        "TA0010"
      ],
      "techniques": []
    },
    "sigmaPath": "cloud/gcp/",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "github-actions-goat",
    "name": "GitHub Actions Goat",
    "domain": "cloud",
    "description": "GitHub Actions security",
    "repo": "https://github.com/step-security/github-actions-goat",
    "docsUrl": "https://github.com/step-security/github-actions-goat",
    "engine": "terraform",
    "environments": [
      "cloud"
    ],
    "provider": "github",
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "hacking-the-cloud",
    "name": "Hacking The Cloud",
    "domain": "cloud",
    "description": "Attack encyclopedia + labs",
    "repo": "https://hackingthe.cloud/",
    "docsUrl": "https://hackingthe.cloud/",
    "engine": "terraform",
    "environments": [
      "cloud"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "sadcloud",
    "name": "Sadcloud",
    "domain": "cloud",
    "description": "Terraform-based insecure AWS",
    "repo": "https://github.com/naggie/sadcloud",
    "docsUrl": "https://github.com/naggie/sadcloud",
    "engine": "terraform",
    "environments": [
      "cloud"
    ],
    "provider": "aws",
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "sans-cloud-security-workshop",
    "name": "SANS Cloud Security Workshop",
    "domain": "cloud",
    "description": "Workshops with detection scenarios",
    "repo": "https://github.com/sans/cloud-security-workshop",
    "docsUrl": "https://github.com/sans/cloud-security-workshop",
    "engine": "terraform",
    "environments": [
      "cloud"
    ],
    "provider": "aws",
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "terragoat",
    "name": "TerraGoat",
    "domain": "cloud",
    "description": "Misconfigured IaC",
    "repo": "https://github.com/bridgecrewio/terragoat",
    "docsUrl": "https://github.com/bridgecrewio/terragoat",
    "engine": "terraform",
    "environments": [
      "cloud"
    ],
    "provider": "aws",
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": [
        "T1578"
      ]
    },
    "sigmaPath": "cloud/terraform/",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "audit-kubernetes",
    "name": "Audit Kubernetes",
    "domain": "iac",
    "description": "Audit Kubernetes — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/DevSecOpsPlayground/Audit-Kubernetes",
    "docsUrl": "https://github.com/DevSecOpsPlayground/Audit-Kubernetes",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "azuregoat-iac",
    "name": "AzureGoat IaC",
    "domain": "iac",
    "description": "AzureGoat IaC — vulnerable lab catalogued from the research set (Cloud).",
    "repo": "https://github.com/ine-labs/AzureGoat",
    "docsUrl": "https://github.com/ine-labs/AzureGoat",
    "engine": "terraform",
    "environments": [
      "cloud"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "cfngoat",
    "name": "CFNgoat",
    "domain": "iac",
    "description": "CFNgoat — vulnerable lab catalogued from the research set (Cloud (AWS)).",
    "repo": "https://github.com/bridgecrewio/cfngoat",
    "docsUrl": "https://github.com/bridgecrewio/cfngoat",
    "engine": "terraform",
    "environments": [
      "cloud"
    ],
    "provider": "aws",
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "checkov-playground",
    "name": "Checkov Playground",
    "domain": "iac",
    "description": "Checkov Playground — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/bridgecrewio/checkov",
    "docsUrl": "https://github.com/bridgecrewio/checkov",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "conftest-playground",
    "name": "Conftest Playground",
    "domain": "iac",
    "description": "Conftest Playground — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/open-policy-agent/conftest",
    "docsUrl": "https://github.com/open-policy-agent/conftest",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "k8sgoat-iac",
    "name": "K8sGoat (IaC)",
    "domain": "iac",
    "description": "K8sGoat (IaC) — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/bridgecrewio/k8sgoat",
    "docsUrl": "https://github.com/bridgecrewio/k8sgoat",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "kics-playground",
    "name": "KICS Playground",
    "domain": "iac",
    "description": "KICS Playground — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/Checkmarx/kics",
    "docsUrl": "https://github.com/Checkmarx/kics",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "opa-playground",
    "name": "OPA Playground",
    "domain": "iac",
    "description": "OPA Playground — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/open-policy-agent/opa",
    "docsUrl": "https://github.com/open-policy-agent/opa",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "pacpro-play",
    "name": "PACPro Play",
    "domain": "iac",
    "description": "PACPro Play — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/Accenture/pacpro",
    "docsUrl": "https://github.com/Accenture/pacpro",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "rego-lab",
    "name": "Rego Lab",
    "domain": "iac",
    "description": "Rego Lab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/open-policy-agent/opa/tree/main/rego",
    "docsUrl": "https://github.com/open-policy-agent/opa/tree/main/rego",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "regula-lab",
    "name": "Regula Lab",
    "domain": "iac",
    "description": "Regula Lab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/aquasecurity/regula",
    "docsUrl": "https://github.com/aquasecurity/regula",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "terrascan-playground",
    "name": "Terrascan Playground",
    "domain": "iac",
    "description": "Terrascan Playground — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/tenable/terrascan",
    "docsUrl": "https://github.com/tenable/terrascan",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "aadinternals",
    "name": "AADInternals",
    "domain": "identity",
    "description": "AADInternals — vulnerable lab catalogued from the research set (Cloud).",
    "repo": "https://github.com/Gerenios/AADInternals",
    "docsUrl": "https://github.com/Gerenios/AADInternals",
    "engine": "terraform",
    "environments": [
      "cloud"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "bark-lab",
    "name": "BARK Lab",
    "domain": "identity",
    "description": "BARK Lab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/Rohnny/BARK-Lab",
    "docsUrl": "https://github.com/Rohnny/BARK-Lab",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "bloodhound-ce",
    "name": "BloodHound CE",
    "domain": "identity",
    "description": "BloodHound CE — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/SpecterOps/BloodHound",
    "docsUrl": "https://github.com/SpecterOps/BloodHound",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "entraattack",
    "name": "EntraAttack",
    "domain": "identity",
    "description": "EntraAttack — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/manwhoami/EntraAttack",
    "docsUrl": "https://github.com/manwhoami/EntraAttack",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "keycloak-goat",
    "name": "Keycloak Goat",
    "domain": "identity",
    "description": "Keycloak Goat — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/jboss/keycloak-goat",
    "docsUrl": "https://github.com/jboss/keycloak-goat",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "labforge-ad-playground",
    "name": "LabForge AD Playground",
    "domain": "identity",
    "description": "LabForge AD Playground — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/fixthebug/LabForge",
    "docsUrl": "https://github.com/fixthebug/LabForge",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "munchhausen-cs-lab",
    "name": "Munchhausen (CS Lab)",
    "domain": "identity",
    "description": "Munchhausen (CS Lab) — vulnerable lab catalogued from the research set (Cloud).",
    "repo": "https://github.com/microsoft/CSLab-Munchhausen",
    "docsUrl": "https://github.com/microsoft/CSLab-Munchhausen",
    "engine": "terraform",
    "environments": [
      "cloud"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "oidc-lab",
    "name": "OIDC Lab",
    "domain": "identity",
    "description": "OIDC Lab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/ossf-critial/oidc-lab",
    "docsUrl": "https://github.com/ossf-critial/oidc-lab",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "okta-auth-lab",
    "name": "Okta Auth Lab",
    "domain": "identity",
    "description": "Okta Auth Lab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/oktadev/auth-lab",
    "docsUrl": "https://github.com/oktadev/auth-lab",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "pingcastle-lab",
    "name": "PingCastle Lab",
    "domain": "identity",
    "description": "PingCastle Lab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/vletoux/pingcastle",
    "docsUrl": "https://github.com/vletoux/pingcastle",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "purple-knight",
    "name": "Purple Knight",
    "domain": "identity",
    "description": "Purple Knight — vulnerable lab catalogued from the research set (Local/Cloud).",
    "repo": "https://www.purpleknight.com",
    "docsUrl": "https://www.purpleknight.com",
    "engine": "docker",
    "environments": [
      "cloud",
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "roadtools-lab",
    "name": "ROADtools Lab",
    "domain": "identity",
    "description": "ROADtools Lab — vulnerable lab catalogued from the research set (Cloud/Local).",
    "repo": "https://github.com/dirkjanm/ROADtools",
    "docsUrl": "https://github.com/dirkjanm/ROADtools",
    "engine": "docker",
    "environments": [
      "cloud",
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "stormspotter",
    "name": "StormSpotter",
    "domain": "identity",
    "description": "StormSpotter — vulnerable lab catalogued from the research set (Cloud (Azure)).",
    "repo": "https://github.com/Azure/Stormspotter",
    "docsUrl": "https://github.com/Azure/Stormspotter",
    "engine": "terraform",
    "environments": [
      "cloud"
    ],
    "provider": "azure",
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "cka-cks-mastery",
    "name": "CKA-CKS Mastery",
    "domain": "k8s",
    "description": "CKA-CKS Mastery — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/r0hi5/CKA-CKS-Mastery",
    "docsUrl": "https://github.com/r0hi5/CKA-CKS-Mastery",
    "engine": "k8s",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "cks-challenge",
    "name": "CKS Challenge",
    "domain": "k8s",
    "description": "CKS Challenge — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/walidshaari/cks-challenge",
    "docsUrl": "https://github.com/walidshaari/cks-challenge",
    "engine": "k8s",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "container-attack-demo",
    "name": "Container Attack Demo",
    "domain": "k8s",
    "description": "Container Attack Demo — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/wiz-sec/container-attack-demo",
    "docsUrl": "https://github.com/wiz-sec/container-attack-demo",
    "engine": "k8s",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "container-security-lab",
    "name": "Container Security Lab",
    "domain": "k8s",
    "description": "Container Security Lab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/raesene/container_security_lab",
    "docsUrl": "https://github.com/raesene/container_security_lab",
    "engine": "k8s",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "docker-attack-platform",
    "name": "Docker Attack Platform",
    "domain": "k8s",
    "description": "Docker Attack Platform — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/lvcccb/docker-attack-platform",
    "docsUrl": "https://github.com/lvcccb/docker-attack-platform",
    "engine": "k8s",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "dvcc",
    "name": "DVCC",
    "domain": "k8s",
    "description": "DVCC — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/haerinia/dvcc",
    "docsUrl": "https://github.com/haerinia/dvcc",
    "engine": "k8s",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "falco-ctf",
    "name": "Falco CTF",
    "domain": "k8s",
    "description": "Falco CTF — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/falcosecurity/falco",
    "docsUrl": "https://github.com/falcosecurity/falco",
    "engine": "k8s",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "k8s-security-lab",
    "name": "K8s Security Lab",
    "domain": "k8s",
    "description": "K8s Security Lab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/mrtc0/k8s-security-lab",
    "docsUrl": "https://github.com/mrtc0/k8s-security-lab",
    "engine": "k8s",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "kubernetes-goat",
    "name": "Kubernetes Goat",
    "domain": "k8s",
    "description": "Kubernetes Goat — vulnerable lab catalogued from the research set (Local/Docker).",
    "repo": "https://github.com/madhuakula/kubernetes-goat",
    "docsUrl": "https://github.com/madhuakula/kubernetes-goat",
    "engine": "k8s",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": [
        "T1611",
        "T1613",
        "T1525",
        "T1610",
        "T1609"
      ]
    },
    "sigmaPath": "cloud/k8s/",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "kubescape-hippo",
    "name": "Kubescape Hippo",
    "domain": "k8s",
    "description": "Kubescape Hippo — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/kubescape/kubescape",
    "docsUrl": "https://github.com/kubescape/kubescape",
    "engine": "k8s",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "kubesecurity-lab",
    "name": "KubeSecurity Lab",
    "domain": "k8s",
    "description": "KubeSecurity Lab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/walidshaari/Kubernetes-Security",
    "docsUrl": "https://github.com/walidshaari/Kubernetes-Security",
    "engine": "k8s",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "kubestriker-lab",
    "name": "Kubestriker Lab",
    "domain": "k8s",
    "description": "Kubestriker Lab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/ridgebucket/kubestriker-lab",
    "docsUrl": "https://github.com/ridgebucket/kubestriker-lab",
    "engine": "k8s",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "kyverno-policy-lab",
    "name": "Kyverno Policy Lab",
    "domain": "k8s",
    "description": "Kyverno Policy Lab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/kyverno/kyverno",
    "docsUrl": "https://github.com/kyverno/kyverno",
    "engine": "k8s",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "misconfig-kubernetes",
    "name": "Misconfig-Kubernetes",
    "domain": "k8s",
    "description": "Misconfig-Kubernetes — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/aquasecurity/misconfig-kubernetes",
    "docsUrl": "https://github.com/aquasecurity/misconfig-kubernetes",
    "engine": "k8s",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "polaris-playground",
    "name": "Polaris Playground",
    "domain": "k8s",
    "description": "Polaris Playground — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/FairwindsOps/polaris",
    "docsUrl": "https://github.com/FairwindsOps/polaris",
    "engine": "k8s",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "tetragon-lab",
    "name": "Tetragon Lab",
    "domain": "k8s",
    "description": "Tetragon Lab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/cilium/tetragon",
    "docsUrl": "https://github.com/cilium/tetragon",
    "engine": "k8s",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "tracee-sample-lab",
    "name": "Tracee Sample Lab",
    "domain": "k8s",
    "description": "Tracee Sample Lab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/aquasecurity/tracee",
    "docsUrl": "https://github.com/aquasecurity/tracee",
    "engine": "k8s",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "auditd-lab",
    "name": "Auditd Lab",
    "domain": "linux",
    "description": "Auditd Lab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/Neo23x0/auditd-lab",
    "docsUrl": "https://github.com/Neo23x0/auditd-lab",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "damn-vulnerable-linux",
    "name": "Damn Vulnerable Linux",
    "domain": "linux",
    "description": "Damn Vulnerable Linux — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/JonathanGiles/DVL",
    "docsUrl": "https://github.com/JonathanGiles/DVL",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "falco-playground",
    "name": "Falco Playground",
    "domain": "linux",
    "description": "Falco Playground — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/falcosecurity/playground",
    "docsUrl": "https://github.com/falcosecurity/playground",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "linux-privesc-arena",
    "name": "Linux PrivEsc Arena",
    "domain": "linux",
    "description": "Linux PrivEsc Arena — vulnerable lab catalogued from the research set (Local/Docker).",
    "repo": "https://github.com/sajadsarvari/linux-privesc-arena",
    "docsUrl": "https://github.com/sajadsarvari/linux-privesc-arena",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "linuxfortress",
    "name": "LinuxFortress",
    "domain": "linux",
    "description": "LinuxFortress — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/0xrawg/linux-fortress",
    "docsUrl": "https://github.com/0xrawg/linux-fortress",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "overthewire",
    "name": "OverTheWire",
    "domain": "linux",
    "description": "OverTheWire — vulnerable lab catalogued from the research set (Online).",
    "repo": "https://overthewire.org/wargames/",
    "docsUrl": "https://overthewire.org/wargames/",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "selinux-playground",
    "name": "SELinux Playground",
    "domain": "linux",
    "description": "SELinux Playground — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/SELinuxProject/selinux-playground",
    "docsUrl": "https://github.com/SELinuxProject/selinux-playground",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "sysmon-for-linux",
    "name": "Sysmon for Linux",
    "domain": "linux",
    "description": "Sysmon for Linux — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/microsoft/SysmonForLinux",
    "docsUrl": "https://github.com/microsoft/SysmonForLinux",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "tcm-linux-priv-esc",
    "name": "TCM Linux Priv-Esc",
    "domain": "linux",
    "description": "TCM Linux Priv-Esc — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/TCM-Course/Linux-Priv-Esc",
    "docsUrl": "https://github.com/TCM-Course/Linux-Priv-Esc",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "tryhackme-linux-privesc",
    "name": "TryHackMe Linux PrivEsc",
    "domain": "linux",
    "description": "TryHackMe Linux PrivEsc — vulnerable lab catalogued from the research set (Online).",
    "repo": "https://tryhackme.com",
    "docsUrl": "https://tryhackme.com",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "vulnhub-images",
    "name": "VulnHub Images",
    "domain": "linux",
    "description": "VulnHub Images — vulnerable lab catalogued from the research set (Local (ISO)).",
    "repo": "https://www.vulnhub.com/",
    "docsUrl": "https://www.vulnhub.com/",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "wazuh-agent-lab",
    "name": "Wazuh Agent Lab",
    "domain": "linux",
    "description": "Wazuh Agent Lab — vulnerable lab catalogued from the research set (Local/Cloud).",
    "repo": "https://github.com/wazuh/wazuh",
    "docsUrl": "https://github.com/wazuh/wazuh",
    "engine": "docker",
    "environments": [
      "cloud",
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": true
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "agenticsecurity",
    "name": "AgenticSecurity",
    "domain": "llm",
    "description": "AgenticSecurity — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/maior/agentic-security",
    "docsUrl": "https://github.com/maior/agentic-security",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "ai-village-ctf",
    "name": "AI Village CTF",
    "domain": "llm",
    "description": "AI Village CTF — vulnerable lab catalogued from the research set (Online).",
    "repo": "https://www.aivillage.ai/",
    "docsUrl": "https://www.aivillage.ai/",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "anthropic-red-team-suite",
    "name": "Anthropic Red Team Suite",
    "domain": "llm",
    "description": "Anthropic Red Team Suite — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/anthropics/anthropic-red-team",
    "docsUrl": "https://github.com/anthropics/anthropic-red-team",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "damn-vulnerable-llm-agent",
    "name": "Damn Vulnerable LLM Agent",
    "domain": "llm",
    "description": "Damn Vulnerable LLM Agent — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/WithSecureLabs/damn-vulnerable-llm-agent",
    "docsUrl": "https://github.com/WithSecureLabs/damn-vulnerable-llm-agent",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "damn-vulnerable-mcp",
    "name": "Damn Vulnerable MCP",
    "domain": "llm",
    "description": "Damn Vulnerable MCP — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/modelcontextprotocol/dvmcp",
    "docsUrl": "https://github.com/modelcontextprotocol/dvmcp",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "garak",
    "name": "Garak",
    "domain": "llm",
    "description": "Garak — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/leondz/garak",
    "docsUrl": "https://github.com/leondz/garak",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "inspector-mcp",
    "name": "Inspector MCP",
    "domain": "llm",
    "description": "Inspector MCP — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/step-security/inspector-mcp",
    "docsUrl": "https://github.com/step-security/inspector-mcp",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "invariant-labs-mcp-tests",
    "name": "Invariant Labs MCP Tests",
    "domain": "llm",
    "description": "Invariant Labs MCP Tests — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/invariantlabs-ai/mcp-safety",
    "docsUrl": "https://github.com/invariantlabs-ai/mcp-safety",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "lakera-gandalf",
    "name": "Lakera Gandalf",
    "domain": "llm",
    "description": "Lakera Gandalf — vulnerable lab catalogued from the research set (Online).",
    "repo": "https://gandalf.lakera.ai/",
    "docsUrl": "https://gandalf.lakera.ai/",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "llmctf",
    "name": "LLMCTF",
    "domain": "llm",
    "description": "LLMCTF — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/LLM-CTF/llmctf",
    "docsUrl": "https://github.com/LLM-CTF/llmctf",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "llmgoat",
    "name": "LLMGoat",
    "domain": "llm",
    "description": "LLMGoat — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/danielmiessler/LLM-Goat",
    "docsUrl": "https://github.com/danielmiessler/LLM-Goat",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "mcp-goat",
    "name": "MCP-Goat",
    "domain": "llm",
    "description": "MCP-Goat — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/obra/mcp-security-lab",
    "docsUrl": "https://github.com/obra/mcp-security-lab",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "mcpscan-playground",
    "name": "MCPScan Playground",
    "domain": "llm",
    "description": "MCPScan Playground — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/protectai/mcp-scan",
    "docsUrl": "https://github.com/protectai/mcp-scan",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "nagini",
    "name": "Nagini",
    "domain": "llm",
    "description": "Nagini — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/sleeyax/nagini",
    "docsUrl": "https://github.com/sleeyax/nagini",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "owasp-agentic-llm-top-10",
    "name": "OWASP Agentic LLM Top 10",
    "domain": "llm",
    "description": "OWASP Agentic LLM Top 10 — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/OWASP-agentic/OWASP-Agentic-LLM-Top-10",
    "docsUrl": "https://github.com/OWASP-agentic/OWASP-Agentic-LLM-Top-10",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "owasp-llm-top10-demo",
    "name": "OWASP LLM Top10 Demo",
    "domain": "llm",
    "description": "OWASP LLM Top10 Demo — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/OWASP/www-project-top-10-for-large-language-model-applications",
    "docsUrl": "https://github.com/OWASP/www-project-top-10-for-large-language-model-applications",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "pacu-llm",
    "name": "Pacu-LLM",
    "domain": "llm",
    "description": "Pacu-LLM — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/RhinoSecurityLabs/pacu",
    "docsUrl": "https://github.com/RhinoSecurityLabs/pacu",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "promptfoo",
    "name": "Promptfoo",
    "domain": "llm",
    "description": "Promptfoo — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/promptfoo/promptfoo",
    "docsUrl": "https://github.com/promptfoo/promptfoo",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "pyrit-microsoft",
    "name": "PyRIT (Microsoft)",
    "domain": "llm",
    "description": "PyRIT (Microsoft) — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/Azure/PyRIT",
    "docsUrl": "https://github.com/Azure/PyRIT",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "tensor-trust",
    "name": "Tensor Trust",
    "domain": "llm",
    "description": "Tensor Trust — vulnerable lab catalogued from the research set (Online).",
    "repo": "https://tensortrust.ai/",
    "docsUrl": "https://tensortrust.ai/",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "androgoat",
    "name": "AndroGoat",
    "domain": "mobile",
    "description": "AndroGoat — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/satishpatnayak/AndroGoat",
    "docsUrl": "https://github.com/satishpatnayak/AndroGoat",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "damn-vulnerable-ios-app",
    "name": "Damn Vulnerable iOS App",
    "domain": "mobile",
    "description": "Damn Vulnerable iOS App — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/prateek147/DVIA",
    "docsUrl": "https://github.com/prateek147/DVIA",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "diva-android",
    "name": "DIVA Android",
    "domain": "mobile",
    "description": "DIVA Android — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/appsectrainings/diva-android",
    "docsUrl": "https://github.com/appsectrainings/diva-android",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "dvhma",
    "name": "DVHMA",
    "domain": "mobile",
    "description": "DVHMA — vulnerable lab catalogued from the research set (Local (Android Studio)).",
    "repo": "https://github.com/0xroot/DVHMA",
    "docsUrl": "https://github.com/0xroot/DVHMA",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "injuredandroid",
    "name": "InjuredAndroid",
    "domain": "mobile",
    "description": "InjuredAndroid — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/AnonJax/InjuredAndroid",
    "docsUrl": "https://github.com/AnonJax/InjuredAndroid",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "mobsf-lab",
    "name": "MobSF Lab",
    "domain": "mobile",
    "description": "MobSF Lab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/MobSF/Mobile-Security-Framework-MobSF",
    "docsUrl": "https://github.com/MobSF/Mobile-Security-Framework-MobSF",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "mstg-hacking-playground",
    "name": "MSTG Hacking Playground",
    "domain": "mobile",
    "description": "MSTG Hacking Playground — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/OWASP/owasp-mastg/tree/master/Android",
    "docsUrl": "https://github.com/OWASP/owasp-mastg/tree/master/Android",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "owasp-igoat",
    "name": "OWASP iGoat",
    "domain": "mobile",
    "description": "OWASP iGoat — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/OWASP/iGoat",
    "docsUrl": "https://github.com/OWASP/iGoat",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "owasp-mastg",
    "name": "OWASP MASTG",
    "domain": "mobile",
    "description": "OWASP MASTG — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/OWASP/owasp-mastg",
    "docsUrl": "https://github.com/OWASP/owasp-mastg",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "owasp-mstg-vulnerable-apps",
    "name": "OWASP MSTG Vulnerable Apps",
    "domain": "mobile",
    "description": "OWASP MSTG Vulnerable Apps — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/OWASP/owasp-mstg",
    "docsUrl": "https://github.com/OWASP/owasp-mstg",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "arkime-moloch-lab",
    "name": "Arkime (Moloch) Lab",
    "domain": "network",
    "description": "Arkime (Moloch) Lab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/arkime/arkime",
    "docsUrl": "https://github.com/arkime/arkime",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "bluespawn",
    "name": "BLUESPAWN",
    "domain": "network",
    "description": "BLUESPAWN — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/BlueTeam-IR/BLUESPAWN",
    "docsUrl": "https://github.com/BlueTeam-IR/BLUESPAWN",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "cyberdefenders-ctfs",
    "name": "CyberDefenders CTFs",
    "domain": "network",
    "description": "CyberDefenders CTFs — vulnerable lab catalogued from the research set (Online).",
    "repo": "https://cyberdefenders.org",
    "docsUrl": "https://cyberdefenders.org",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "letsdefend-io",
    "name": "LetsDefend.io",
    "domain": "network",
    "description": "LetsDefend.io — vulnerable lab catalogued from the research set (Online).",
    "repo": "https://letsdefend.io",
    "docsUrl": "https://letsdefend.io",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "malware-traffic-analysis",
    "name": "Malware Traffic Analysis",
    "domain": "network",
    "description": "Malware Traffic Analysis — vulnerable lab catalogued from the research set (Online PCAP).",
    "repo": "https://www.malware-traffic-analysis.net/",
    "docsUrl": "https://www.malware-traffic-analysis.net/",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "mordor-forge",
    "name": "Mordor (Forge)",
    "domain": "network",
    "description": "Mordor (Forge) — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/hunters-forge/mordor",
    "docsUrl": "https://github.com/hunters-forge/mordor",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "mordor-datasets",
    "name": "Mordor Datasets",
    "domain": "network",
    "description": "Mordor Datasets — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/OTRF/mordor",
    "docsUrl": "https://github.com/OTRF/mordor",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "netresec-samples",
    "name": "NetRESec Samples",
    "domain": "network",
    "description": "NetRESec Samples — vulnerable lab catalogued from the research set (Online).",
    "repo": "https://www.netresec.com/?page=PcapFiles",
    "docsUrl": "https://www.netresec.com/?page=PcapFiles",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "pcap-files-collection",
    "name": "PCAP Files Collection",
    "domain": "network",
    "description": "PCAP Files Collection — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/joeylane/pcapfiles",
    "docsUrl": "https://github.com/joeylane/pcapfiles",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "pcap-labs",
    "name": "PCAP Labs",
    "domain": "network",
    "description": "PCAP Labs — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/markleehunt/pcap-labs",
    "docsUrl": "https://github.com/markleehunt/pcap-labs",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "sigmahq-ruleset",
    "name": "SigmaHQ Ruleset",
    "domain": "network",
    "description": "SigmaHQ Ruleset — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/SigmaHQ/sigma",
    "docsUrl": "https://github.com/SigmaHQ/sigma",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "splunk-bots-v2",
    "name": "Splunk BOTS v2",
    "domain": "network",
    "description": "Splunk BOTS v2 — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/splunk/botsv2",
    "docsUrl": "https://github.com/splunk/botsv2",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "splunk-bots-v3",
    "name": "Splunk BOTS v3",
    "domain": "network",
    "description": "Splunk BOTS v3 — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/splunk/botsv3",
    "docsUrl": "https://github.com/splunk/botsv3",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "stenographer-lab",
    "name": "Stenographer Lab",
    "domain": "network",
    "description": "Stenographer Lab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/google/stenographer",
    "docsUrl": "https://github.com/google/stenographer",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "suricata-playground",
    "name": "Suricata Playground",
    "domain": "network",
    "description": "Suricata Playground — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/OISF/suricata",
    "docsUrl": "https://github.com/OISF/suricata",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "threathunter-playbook",
    "name": "ThreatHunter Playbook",
    "domain": "network",
    "description": "ThreatHunter Playbook — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/OTRF/ThreatHunter-Playbook",
    "docsUrl": "https://github.com/OTRF/ThreatHunter-Playbook",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "tryhackme-soc",
    "name": "TryHackMe SOC",
    "domain": "network",
    "description": "TryHackMe SOC — vulnerable lab catalogued from the research set (Online).",
    "repo": "https://tryhackme.com",
    "docsUrl": "https://tryhackme.com",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "wireshark-sample-captures",
    "name": "Wireshark Sample Captures",
    "domain": "network",
    "description": "Wireshark Sample Captures — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://wiki.wireshark.org/SampleCaptures",
    "docsUrl": "https://wiki.wireshark.org/SampleCaptures",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "zeek-security-repo",
    "name": "Zeek Security Repo",
    "domain": "network",
    "description": "Zeek Security Repo — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/zeek/zeek",
    "docsUrl": "https://github.com/zeek/zeek",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "conpot-honeypot",
    "name": "Conpot Honeypot",
    "domain": "ot",
    "description": "Conpot Honeypot — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/mushorg/conpot",
    "docsUrl": "https://github.com/mushorg/conpot",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "cymilab",
    "name": "CymiLab",
    "domain": "ot",
    "description": "CymiLab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/0xc0z/CymiLab",
    "docsUrl": "https://github.com/0xc0z/CymiLab",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "damn-vulnerable-chemical-process",
    "name": "Damn Vulnerable Chemical Process",
    "domain": "ot",
    "description": "Damn Vulnerable Chemical Process — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/ukncsc/DVC",
    "docsUrl": "https://github.com/ukncsc/DVC",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "damn-vulnerable-plc",
    "name": "Damn Vulnerable PLC",
    "domain": "ot",
    "description": "Damn Vulnerable PLC — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/dhondta/damn-vulnerable-plc",
    "docsUrl": "https://github.com/dhondta/damn-vulnerable-plc",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "dvrf-router-firmware",
    "name": "DVRF (Router Firmware)",
    "domain": "ot",
    "description": "DVRF (Router Firmware) — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/praetorian-inc/DVRF",
    "docsUrl": "https://github.com/praetorian-inc/DVRF",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "firmware-slap",
    "name": "Firmware Slap",
    "domain": "ot",
    "description": "Firmware Slap — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/ChrisTheCoolHut/FirmwareSlap",
    "docsUrl": "https://github.com/ChrisTheCoolHut/FirmwareSlap",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "ics-security-testbeds",
    "name": "ICS Security Testbeds",
    "domain": "ot",
    "description": "ICS Security Testbeds — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/ITI/ICS-Security-Testbeds",
    "docsUrl": "https://github.com/ITI/ICS-Security-Testbeds",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "iot-lab",
    "name": "IoT Lab",
    "domain": "ot",
    "description": "IoT Lab — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/HighTable/IoT-Lab",
    "docsUrl": "https://github.com/HighTable/IoT-Lab",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "iotgoat-owasp",
    "name": "IoTGoat (OWASP)",
    "domain": "ot",
    "description": "IoTGoat (OWASP) — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/OWASP/IoTGoat",
    "docsUrl": "https://github.com/OWASP/IoTGoat",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "minicps3",
    "name": "MiniCPS3",
    "domain": "ot",
    "description": "MiniCPS3 — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/scadastrangelove/MiniCPS3",
    "docsUrl": "https://github.com/scadastrangelove/MiniCPS3",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "redpoint-digitalbond",
    "name": "Redpoint (DigitalBond)",
    "domain": "ot",
    "description": "Redpoint (DigitalBond) — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/digitalbond/Redpoint",
    "docsUrl": "https://github.com/digitalbond/Redpoint",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "t-pot-honeypot",
    "name": "T-Pot Honeypot",
    "domain": "ot",
    "description": "T-Pot Honeypot — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/telekom-security/tpotce",
    "docsUrl": "https://github.com/telekom-security/tpotce",
    "engine": "manual",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "api-sec-lab-checkmarx",
    "name": "API Sec Lab (Checkmarx)",
    "domain": "web",
    "description": "API Sec Lab (Checkmarx) — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/Checkmarx/api-sec-lab",
    "docsUrl": "https://github.com/Checkmarx/api-sec-lab",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "buggybank",
    "name": "BuggyBank",
    "domain": "web",
    "description": "BuggyBank — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/jemnight/BuggyBank",
    "docsUrl": "https://github.com/jemnight/BuggyBank",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "dvga-graphql",
    "name": "DVGA (GraphQL)",
    "domain": "web",
    "description": "DVGA (GraphQL) — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/daniel-rudakov/DVGA",
    "docsUrl": "https://github.com/daniel-rudakov/DVGA",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": [
        "T1592",
        "T1190"
      ]
    },
    "sigmaPath": "web/graphql/",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "dvna",
    "name": "DVNA",
    "domain": "web",
    "description": "DVNA — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/appsecco/dvna",
    "docsUrl": "https://github.com/appsecco/dvna",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "dvta",
    "name": "DVTA",
    "domain": "web",
    "description": "DVTA — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/srini0x00/dvta",
    "docsUrl": "https://github.com/srini0x00/dvta",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "dvwa",
    "name": "DVWA",
    "domain": "web",
    "description": "DVWA — vulnerable lab catalogued from the research set (Local/Docker).",
    "repo": "https://github.com/digininja/DVWA",
    "docsUrl": "https://github.com/digininja/DVWA",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": [
        "T1190",
        "T1059",
        "T1078"
      ]
    },
    "sigmaPath": "web/",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "dvws-node",
    "name": "DVWS-node",
    "domain": "web",
    "description": "DVWS-node — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/snoopysecurity/dvws-node",
    "docsUrl": "https://github.com/snoopysecurity/dvws-node",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "mutillidae",
    "name": "Mutillidae",
    "domain": "web",
    "description": "Mutillidae — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/webpwnized/mutillidae",
    "docsUrl": "https://github.com/webpwnized/mutillidae",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "owasp-crapi",
    "name": "OWASP crAPI",
    "domain": "web",
    "description": "OWASP crAPI — vulnerable lab catalogued from the research set (Local/Docker).",
    "repo": "https://github.com/OWASP/crAPI",
    "docsUrl": "https://github.com/OWASP/crAPI",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": [
        "T1190",
        "T1059"
      ]
    },
    "sigmaPath": "web/api/",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "owasp-juice-shop",
    "name": "OWASP Juice Shop",
    "domain": "web",
    "description": "OWASP Juice Shop — vulnerable lab catalogued from the research set (Local/Docker).",
    "repo": "https://github.com/bkimminich/juice-shop",
    "docsUrl": "https://github.com/bkimminich/juice-shop",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": [
        "T1190",
        "T1071",
        "T1505"
      ]
    },
    "sigmaPath": "web/",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "owasp-nodegoat",
    "name": "OWASP NodeGoat",
    "domain": "web",
    "description": "OWASP NodeGoat — vulnerable lab catalogued from the research set (Local/Docker).",
    "repo": "https://github.com/OWASP/NodeGoat",
    "docsUrl": "https://github.com/OWASP/NodeGoat",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "owasp-pygoat",
    "name": "OWASP PyGoat",
    "domain": "web",
    "description": "OWASP PyGoat — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/adeyosemanaj/PyGoat",
    "docsUrl": "https://github.com/adeyosemanaj/PyGoat",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "owasp-railsgoat",
    "name": "OWASP RailsGoat",
    "domain": "web",
    "description": "OWASP RailsGoat — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/OWASP/railsgoat",
    "docsUrl": "https://github.com/OWASP/railsgoat",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "owasp-security-shepherd",
    "name": "OWASP Security Shepherd",
    "domain": "web",
    "description": "OWASP Security Shepherd — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/OWASP/SecurityShepherd",
    "docsUrl": "https://github.com/OWASP/SecurityShepherd",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "owasp-webgoat",
    "name": "OWASP WebGoat",
    "domain": "web",
    "description": "OWASP WebGoat — vulnerable lab catalogued from the research set (Local/Docker).",
    "repo": "https://github.com/WebGoat/WebGoat",
    "docsUrl": "https://github.com/WebGoat/WebGoat",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "portswigger-web-security-academy",
    "name": "PortSwigger Web Security Academy",
    "domain": "web",
    "description": "PortSwigger Web Security Academy — vulnerable lab catalogued from the research set (Online).",
    "repo": "https://portswigger.net/web-security",
    "docsUrl": "https://portswigger.net/web-security",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "tcm-webappsec-labs",
    "name": "TCM WebAppSec Labs",
    "domain": "web",
    "description": "TCM WebAppSec Labs — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/TCM-Course/Lab",
    "docsUrl": "https://github.com/TCM-Course/Lab",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "vampi",
    "name": "VAmPI",
    "domain": "web",
    "description": "VAmPI — vulnerable lab catalogued from the research set (Local/Docker).",
    "repo": "https://github.com/erev0s/VAmPI",
    "docsUrl": "https://github.com/erev0s/VAmPI",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  },
  {
    "id": "xvwa",
    "name": "XVWA",
    "domain": "web",
    "description": "XVWA — vulnerable lab catalogued from the research set (Local).",
    "repo": "https://github.com/s4n7h0/xvwa",
    "docsUrl": "https://github.com/s4n7h0/xvwa",
    "engine": "docker",
    "environments": [
      "local"
    ],
    "provider": null,
    "resources": {
      "cpus": 2,
      "memoryMB": 4096,
      "diskGB": 10
    },
    "services": [],
    "attack": {
      "tactics": [],
      "techniques": []
    },
    "sigmaPath": "",
    "isolation": {
      "requiresEgress": true,
      "requiresPublicIp": false
    },
    "deploy": {
      "available": false
    },
    "imported": true,
    "seeded": true
  }
];
