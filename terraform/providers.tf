terraform {
  required_version = ">= 1.5.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.0"
    }
  }
}

# Authenticates Terraform to Cloudflare using an API token.
# The token itself is never written here — it is read from the
# CLOUDFLARE_API_TOKEN environment variable (local dev) or from
# GitHub Secrets (CI/CD), and passed in as var.cloudflare_api_token.
provider "cloudflare" {
  api_token = var.cloudflare_api_token
}
