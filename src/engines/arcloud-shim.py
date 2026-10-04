#!/usr/bin/env python3
"""rtlab's thin driver for Splunk Attack Range 4.x in the cloud (AWS). Runs inside the Attack Range checkout with its
own virtualenv, so the project's config loader, Terraform wrapper and provisioning stay exactly upstream's.

  plan <config>            terraform init + plan (nothing is created); prints the plan output
  build <config>           attack_range build (terraform apply + Ansible)
  destroy <config>         attack_range destroy (terraform destroy -auto-approve)
  instances <config>       JSON list of the range's EC2 instances (name, state, public_ip, private_ip)
  keypair-import <config> <public key file>
  keypair-delete <config>
  sg-status <config>       JSON: the range's security groups and which ports are open to the whole internet
  sg-lockdown <config> <runner ip> <vpn udp port>
                           make the range VPN-only: drop every rule open to the internet, admit only the VPN port
                           from anywhere and SSH/WinRM/Splunk-API from the runner (for provisioning); VPC-internal rules stay
"""
import json, os, subprocess, sys

# Ports the runner itself needs on the public addresses after lockdown: SSH and WinRM for Ansible, the Splunk API for the
# range's own tooling (attack simulation, data dumps). Everything a student uses goes through the VPN.
MGMT_PORTS = ((22, "tcp"), (5985, "tcp"), (5986, "tcp"), (8089, "tcp"))
OPEN = "0.0.0.0/0"

def lockdown_plan(perms, runner_ip, vpn_port):
    """Pure: (revoke, authorize) IpPermissions lists that turn `perms` into the VPN-only shape. Idempotent."""
    revoke, have = [], set()
    for p in perms:
        proto, lo, hi = p.get("IpProtocol"), p.get("FromPort"), p.get("ToPort")
        for r in p.get("IpRanges", []):
            cidr = r.get("CidrIp")
            keep = (proto == "udp" and lo == vpn_port and hi == vpn_port and cidr == OPEN)
            if cidr == OPEN and not keep:
                revoke.append({"IpProtocol": proto, **({"FromPort": lo, "ToPort": hi} if lo is not None else {}), "IpRanges": [{"CidrIp": OPEN}]})
            have.add((proto, lo, hi, cidr))
    want = [("udp", vpn_port, vpn_port, OPEN, "rtlab lab VPN")] + [(pr, po, po, f"{runner_ip}/32", "rtlab runner (provisioning)") for po, pr in MGMT_PORTS]
    authorize = [{"IpProtocol": pr, "FromPort": lo, "ToPort": hi, "IpRanges": [{"CidrIp": cidr, "Description": d}]} for pr, lo, hi, cidr, d in want if (pr, lo, hi, cidr) not in have]
    return revoke, authorize

def public_ports(perms):
    """Ports (proto/from-to) any address on the internet may reach."""
    out = []
    for p in perms:
        if any(r.get("CidrIp") == OPEN for r in p.get("IpRanges", [])):
            out.append({"protocol": p.get("IpProtocol"), "from": p.get("FromPort"), "to": p.get("ToPort")})
    return out

def range_sgs(client, config):
    key, name = names(config)
    r = client.describe_instances(Filters=[{"Name": "tag:Name", "Values": [f"ar-*-{key}-{name}", f"ar-*-{key}-{name}-*"]}, {"Name": "instance-state-name", "Values": ["pending", "running", "stopping", "stopped"]}])
    ids = sorted({g["GroupId"] for res in r.get("Reservations", []) for i in res.get("Instances", []) for g in i.get("SecurityGroups", [])})
    return client.describe_security_groups(GroupIds=ids)["SecurityGroups"] if ids else []

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def load(cfg):
    from modules.config_handler import ConfigHandler   # Attack Range's own loader (this file runs inside its checkout)
    config = ConfigHandler.read_config(cfg)
    ConfigHandler.validate_config(config)
    provider = config["general"]["cloud_provider"]
    for k in ("aws", "azure", "gcp"):
        if k != provider:
            config.pop(k, None)
    return config

def names(config):
    key, name = config["general"]["key_name"], config["general"]["attack_range_name"]
    return key, name

def ec2(config):
    import boto3
    return boto3.client("ec2", region_name=config["aws"]["region"])

def main():
    action, cfg = sys.argv[1], sys.argv[2]
    config = load(cfg)
    if action in ("plan", "build", "destroy"):
        from python_terraform import IsFlagged, IsNotFlagged
        provider = config["general"]["cloud_provider"]
        if provider == "aws":
            from modules.aws_controller import AwsController as Ctl
        elif provider == "azure":
            from modules.azure_controller import AzureController as Ctl
        elif provider == "gcp":
            from modules.gcp_controller import GCPController as Ctl
        else:
            sys.exit(f"unsupported provider {provider}")
        c = Ctl(config)
        tf = os.path.join(os.path.dirname(os.path.abspath(__file__)), "terraform", provider)
        if action == "plan":
            subprocess.run(["terraform", "init", "-input=false", "-no-color"], cwd=tf, check=True)
            rc, out, err = c.terraform.plan(capture_output=True, no_color=IsFlagged, detailed_exitcode=IsNotFlagged, input=False, out="rtlab.tfplan")
            sys.stdout.write(out or ""); sys.stderr.write(err or "")
            sys.exit(0 if rc in (0, 2) else rc or 1)
        if action == "build":
            c.build()
        else:
            c.destroy()
        return
    if action == "instances":
        if config["general"]["cloud_provider"] != "aws":
            print("[]")   # public addresses for Azure/GCP are read from `attack_range show` by the operator for now
            return
        key, name = names(config)
        pats = [f"ar-*-{key}-{name}", f"ar-*-{key}-{name}-*"]
        r = ec2(config).describe_instances(Filters=[{"Name": "tag:Name", "Values": pats}])
        rows = []
        for res in r.get("Reservations", []):
            for i in res.get("Instances", []):
                tag = next((t["Value"] for t in i.get("Tags", []) if t["Key"] == "Name"), "")
                rows.append({"name": tag, "state": i["State"]["Name"], "public_ip": i.get("PublicIpAddress"), "private_ip": i.get("PrivateIpAddress"), "type": i.get("InstanceType"), "id": i["InstanceId"]})
        print(json.dumps(rows))
        return
    if action == "keypair-import":
        key, _ = names(config)
        with open(sys.argv[3], "rb") as f:
            material = f.read()
        try:
            ec2(config).import_key_pair(KeyName=key, PublicKeyMaterial=material)
            print(f"imported key pair {key}")
        except Exception as e:  # already there is fine
            if "InvalidKeyPair.Duplicate" in str(e):
                print(f"key pair {key} already exists")
            else:
                raise
        return
    if action == "keypair-delete":
        key, _ = names(config)
        ec2(config).delete_key_pair(KeyName=key)
        print(f"deleted key pair {key}")
        return
    if action in ("sg-status", "sg-lockdown"):
        if config["general"]["cloud_provider"] != "aws":
            sys.exit("VPN-only lockdown is implemented for AWS ranges only (Azure/GCP: edit the network security rules by hand)")
        client = ec2(config)
        groups = range_sgs(client, config)
        if not groups:
            sys.exit("no security group found for this range (is it applied?)")
        if action == "sg-lockdown":
            runner_ip, vpn_port = sys.argv[3], int(sys.argv[4])
            import ipaddress
            ipaddress.IPv4Address(runner_ip)   # raises on anything that is not a plain IPv4 address
            changed = []
            for g in groups:
                revoke, authorize = lockdown_plan(g.get("IpPermissions", []), runner_ip, vpn_port)
                if authorize:   # admit first, revoke second: the runner never loses its own way in
                    try:
                        client.authorize_security_group_ingress(GroupId=g["GroupId"], IpPermissions=authorize)
                    except Exception as e:
                        if "InvalidPermission.Duplicate" not in str(e):
                            raise
                if revoke:
                    client.revoke_security_group_ingress(GroupId=g["GroupId"], IpPermissions=revoke)
                changed.append({"id": g["GroupId"], "name": g.get("GroupName"), "revoked": len(revoke), "authorized": len(authorize)})
            groups = client.describe_security_groups(GroupIds=[g["GroupId"] for g in groups])["SecurityGroups"]
            print(json.dumps({"changed": changed, "groups": [{"id": g["GroupId"], "name": g.get("GroupName"), "public_ports": public_ports(g.get("IpPermissions", []))} for g in groups]}))
            return
        print(json.dumps({"groups": [{"id": g["GroupId"], "name": g.get("GroupName"), "public_ports": public_ports(g.get("IpPermissions", []))} for g in groups]}))
        return
    sys.exit(f"unknown action {action}")

if __name__ == "__main__":
    main()
