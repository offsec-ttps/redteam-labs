# VPS test coverage (2026-10-12)

Server: Linode 45.79.210.42 (4 vCPU, 8 GB). Access: private WireGuard only. Every lab deployed, verified reachable over the VPN, then destroyed.

**VPS-eligible docker labs: 35**  ·  green 33 · yellow 2 · red 0

| Lab | Domain | VPS |
|---|---|---|
| bloodhound-ce | identity | 🟢 tested |
| cicd-goat | cicd | 🟡 needs bigger box |
| confluence@CVE-2022-26134 | service-cve | 🟢 tested |
| conpot-honeypot | ot | 🟢 tested |
| crapi | web | 🟢 tested |
| damn-vulnerable-llm-agent | llm | 🟡 needs bigger box |
| dvga | web | 🟢 tested |
| dvna | web | 🟢 tested |
| dvwa | web | 🟢 tested |
| dvws-node | web | 🟢 tested |
| httpd@CVE-2017-15715 | service-cve | 🟢 tested |
| httpd@CVE-2021-41773 | service-cve | 🟢 tested |
| httpd@CVE-2021-42013 | service-cve | 🟢 tested |
| iotgoat-owasp | ot | 🟢 tested |
| jenkins@CVE-2018-1000861 | service-cve | 🟢 tested |
| juice-shop | web | 🟢 tested |
| log4j@CVE-2021-44228 | service-cve | 🟢 tested |
| mobsf-lab | mobile | 🟢 tested |
| mutillidae | web | 🟢 tested |
| nginx@CVE-2013-4547 | service-cve | 🟢 tested |
| nginx@insecure-config | service-cve | 🟢 tested |
| owasp-nodegoat | web | 🟢 tested |
| owasp-railsgoat | web | 🟢 tested |
| redis@CVE-2022-0543 | service-cve | 🟢 tested |
| redis@unauth | service-cve | 🟢 tested |
| spring@CVE-2022-22947 | service-cve | 🟢 tested |
| spring@CVE-2022-22965 | service-cve | 🟢 tested |
| struts2@S2-046 | service-cve | 🟢 tested |
| struts2@S2-053 | service-cve | 🟢 tested |
| tomcat@CVE-2017-12615 | service-cve | 🟢 tested |
| tomcat@CVE-2020-1938 | service-cve | 🟢 tested |
| tomcat@weak-password | service-cve | 🟢 tested |
| vampi | web | 🟢 tested |
| webgoat | web | 🟢 tested |
| weblogic@CVE-2017-10271 | service-cve | 🟢 tested |

## Not VPS-deployable (tagged N/A): 68 labs
- Guided/unavailable docker tools, kubernetes, cloud/terraform, full-VM, attack-range and manual labs.
