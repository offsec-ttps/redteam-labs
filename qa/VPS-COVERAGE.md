# VPS test coverage (2026-10-13)

Server: Linode 45.79.210.42 (4 vCPU, 8 GB). Access: private WireGuard only. Every lab deployed, verified reachable over the VPN, then destroyed. Docker labs run containers directly; Kubernetes labs run in a disposable k3d cluster.

**VPS-eligible labs: 36**  ·  green 34 · yellow 2 · red 0

| Lab | Domain | Engine | VPS |
|---|---|---|---|
| bloodhound-ce | identity | docker | 🟢 tested |
| cicd-goat | cicd | docker | 🟡 needs bigger box |
| confluence@CVE-2022-26134 | service-cve | docker | 🟢 tested |
| conpot-honeypot | ot | docker | 🟢 tested |
| crapi | web | docker | 🟢 tested |
| damn-vulnerable-llm-agent | llm | docker | 🟡 needs bigger box |
| dvga | web | docker | 🟢 tested |
| dvna | web | docker | 🟢 tested |
| dvwa | web | docker | 🟢 tested |
| dvws-node | web | docker | 🟢 tested |
| httpd@CVE-2017-15715 | service-cve | docker | 🟢 tested |
| httpd@CVE-2021-41773 | service-cve | docker | 🟢 tested |
| httpd@CVE-2021-42013 | service-cve | docker | 🟢 tested |
| iotgoat-owasp | ot | docker | 🟢 tested |
| jenkins@CVE-2018-1000861 | service-cve | docker | 🟢 tested |
| juice-shop | web | docker | 🟢 tested |
| kubernetes-goat | k8s | k8s | 🟢 tested |
| log4j@CVE-2021-44228 | service-cve | docker | 🟢 tested |
| mobsf-lab | mobile | docker | 🟢 tested |
| mutillidae | web | docker | 🟢 tested |
| nginx@CVE-2013-4547 | service-cve | docker | 🟢 tested |
| nginx@insecure-config | service-cve | docker | 🟢 tested |
| owasp-nodegoat | web | docker | 🟢 tested |
| owasp-railsgoat | web | docker | 🟢 tested |
| redis@CVE-2022-0543 | service-cve | docker | 🟢 tested |
| redis@unauth | service-cve | docker | 🟢 tested |
| spring@CVE-2022-22947 | service-cve | docker | 🟢 tested |
| spring@CVE-2022-22965 | service-cve | docker | 🟢 tested |
| struts2@S2-046 | service-cve | docker | 🟢 tested |
| struts2@S2-053 | service-cve | docker | 🟢 tested |
| tomcat@CVE-2017-12615 | service-cve | docker | 🟢 tested |
| tomcat@CVE-2020-1938 | service-cve | docker | 🟢 tested |
| tomcat@weak-password | service-cve | docker | 🟢 tested |
| vampi | web | docker | 🟢 tested |
| webgoat | web | docker | 🟢 tested |
| weblogic@CVE-2017-10271 | service-cve | docker | 🟢 tested |

## Not VPS-deployable (tagged N/A): 67 labs
- Guided/unavailable docker tools, remaining kubernetes labs, cloud/terraform, full-VM, attack-range and manual labs.
