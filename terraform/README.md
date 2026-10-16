# Terraform: AWS VPC + EKS

| File | What it creates |
|------|-----------------|
| `main.tf` | VPC (2 public + 2 private subnets in 2 AZs, NAT gateway), EKS cluster, managed node group, EKS add-ons (VPC CNI, CoreDNS, kube-proxy, metrics-server, EBS CSI driver), IAM role for the EBS CSI driver |
| `github-oidc.tf` | GitHub Actions OIDC provider and an IAM role that only `main` of this repo can assume, mapped to the cluster through an EKS access entry |
| `variables.tf` / `terraform.tfvars.example` | Inputs (region, sizes, Kubernetes version, repo) |
| `outputs.tf` | VPC/subnet IDs, cluster name/endpoint, kubeconfig command, deploy role ARN |

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars   # set github_repository
terraform init
terraform plan -out tfplan
terraform apply tfplan                          # ~15-20 minutes
$(terraform output -raw configure_kubectl)      # point kubectl at the cluster
cd .. && ./scripts/eks-up.sh                    # ingress, monitoring, app
```

Credentials come from `aws configure` (or `AWS_PROFILE`); nothing secret lives in this folder.
`*.tfvars` and state files are git-ignored.

## Tear down

Kubernetes creates an AWS load balancer and EBS volumes that Terraform does not know about,
so remove them first or `terraform destroy` will hang on the VPC:

```bash
./scripts/eks-down.sh     # helm uninstall everything, wait for the NLB to go, terraform destroy
```

## Cost (ap-south-1, approx.)

EKS control plane $0.10/h + 2 × t3.medium ~$0.09/h + NAT gateway ~$0.06/h + NLB ~$0.03/h ≈ **$0.30/hour**.
