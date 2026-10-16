# ---------------------------------------------------------------------------
# GitHub Actions -> AWS without stored keys.
# The workflow exchanges its short-lived OIDC token for this role, which is
# trusted only for pushes to the main branch of var.github_repository.
# ---------------------------------------------------------------------------
locals {
  github_enabled = var.github_repository != ""
}

resource "aws_iam_openid_connect_provider" "github" {
  count          = local.github_enabled && var.create_github_oidc_provider ? 1 : 0
  url            = "https://token.actions.githubusercontent.com"
  client_id_list = ["sts.amazonaws.com"]
}

data "aws_iam_openid_connect_provider" "github" {
  count = local.github_enabled && !var.create_github_oidc_provider ? 1 : 0
  url   = "https://token.actions.githubusercontent.com"
}

locals {
  github_oidc_arn = !local.github_enabled ? null : (
    var.create_github_oidc_provider
    ? aws_iam_openid_connect_provider.github[0].arn
    : data.aws_iam_openid_connect_provider.github[0].arn
  )
}

resource "aws_iam_role" "github_deploy" {
  count = local.github_enabled ? 1 : 0
  name  = "${local.name}-github-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = local.github_oidc_arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
          # Accept both the classic name-based subject and GitHub's immutable (ID-based) subject.
          "token.actions.githubusercontent.com:sub" = compact([
            "repo:${var.github_repository}:ref:refs/heads/main",
            var.github_oidc_sub_prefix == "" ? "" : "${var.github_oidc_sub_prefix}:ref:refs/heads/main",
          ])
        }
      }
    }]
  })
}

# Just enough AWS permission to build a kubeconfig; Kubernetes access comes from the EKS access entry.
resource "aws_iam_role_policy" "github_deploy" {
  count = local.github_enabled ? 1 : 0
  name  = "eks-describe"
  role  = aws_iam_role.github_deploy[0].id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect   = "Allow"
      Action   = ["eks:DescribeCluster"]
      Resource = module.eks.cluster_arn
    }]
  })
}
