/**
 * GENERATED — do not edit by hand.
 *   node scripts/import-docx-catalog.mjs --docx <Detection_Engineering_Lab_Catalog.docx>
 *
 * Imported from the research catalog (Detection_Engineering_Lab_Catalog.docx).
 * 90 labs (after the audit) across 12 domains:
 * ad=21 · cicd=17 · cloud=15 · iac=12 · identity=13 · k8s=17 · linux=12 · llm=20 · mobile=10 · network=19 · ot=12 · web=19
 *
 * AUDIT 2026-10-01: every repo was checked. 97 entries were REMOVED because the repository
 * does not exist (GitHub 404), or the link was a hosted platform / sample-capture site rather
 * than an installable lab. The removed ids are listed in catalog-removed.json next to this file.
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": true
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": false
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
    "seeded": true,
    "repoVerified": true
  }
];
