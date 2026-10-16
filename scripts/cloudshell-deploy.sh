#!/usr/bin/env bash
# One-shot AWS deployment from AWS CloudShell (uses the console session; no access keys needed).
#   git clone https://github.com/16pragyatripathi/devops-capstone-stockpilot.git && cd devops-capstone-stockpilot
#   ./scripts/cloudshell-deploy.sh 2>&1 | tee ~/stockpilot-deploy.log
set -euo pipefail
cd "$(dirname "$0")/.."
REPO="${GITHUB_REPOSITORY:-16pragyatripathi/devops-capstone-stockpilot}"
export AWS_REGION="${AWS_REGION:-ap-south-1}" AWS_DEFAULT_REGION="${AWS_REGION:-ap-south-1}"
BIN="$HOME/bin"; mkdir -p "$BIN"; export PATH="$BIN:$PATH"
ARCH="$(uname -m | sed 's/x86_64/amd64/; s/aarch64/arm64/')"
# Provider binaries are large; keep them off the 1 GB persistent home directory.
export TF_DATA_DIR=/tmp/stockpilot-terraform

echo "==> Tools"
command -v terraform >/dev/null || { curl -fsSLo /tmp/tf.zip "https://releases.hashicorp.com/terraform/1.16.5/terraform_1.16.5_linux_${ARCH}.zip" && unzip -oq /tmp/tf.zip -d "$BIN"; }
command -v helm >/dev/null || { curl -fsSL "https://get.helm.sh/helm-v4.3.0-linux-${ARCH}.tar.gz" | tar xz -C /tmp && mv "/tmp/linux-${ARCH}/helm" "$BIN/"; }
command -v kubectl >/dev/null || { curl -fsSLo "$BIN/kubectl" "https://dl.k8s.io/release/v1.34.1/bin/linux/${ARCH}/kubectl" && chmod +x "$BIN/kubectl"; }
terraform version | head -1; helm version --short; kubectl version --client | head -1
aws sts get-caller-identity

CREATE_OIDC=true
aws iam list-open-id-connect-providers --query 'OpenIDConnectProviderList[].Arn' --output text \
  | grep -q token.actions.githubusercontent.com && CREATE_OIDC=false
K8S="$(aws eks describe-cluster-versions --default-only --query 'clusterVersions[0].clusterVersion' --output text 2>/dev/null || true)"
[[ "$K8S" =~ ^1\.[0-9]+$ ]] || K8S=1.34
echo "GitHub OIDC provider to be created: $CREATE_OIDC   Kubernetes: $K8S"

echo "==> Terraform"
cd terraform
terraform init -input=false
terraform plan -input=false -out tfplan \
  -var "aws_region=$AWS_REGION" -var "github_repository=$REPO" \
  -var "create_github_oidc_provider=$CREATE_OIDC" -var "kubernetes_version=$K8S"
terraform apply -input=false tfplan
terraform output
cd ..

# Deploy the newest image that passed CI.
export IMAGE_TAG="${IMAGE_TAG:-$(curl -fsSL "https://api.github.com/repos/$REPO/actions/runs?branch=main&status=success&per_page=1" | python3 -c 'import sys,json;print(json.load(sys.stdin)["workflow_runs"][0]["head_sha"])')}"
export IMAGE_OWNER="${REPO%%/*}"
echo "==> Deploying image tag $IMAGE_TAG"
./scripts/eks-up.sh
