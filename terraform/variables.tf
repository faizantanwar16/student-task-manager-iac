variable "cloudflare_api_token" {
  description = "Cloudflare API token (needs Workers Scripts:Edit and Workers KV Storage:Edit permissions). Never hard-code this — pass it via TF_VAR_cloudflare_api_token or a .tfvars file that is git-ignored."
  type        = string
  sensitive   = true
}

variable "account_id" {
  description = "Your Cloudflare account ID (Cloudflare dashboard > Workers & Pages > Overview, right-hand sidebar)."
  type        = string
}

variable "workers_subdomain" {
  description = "Your account's workers.dev subdomain, chosen the first time you opened Workers & Pages. If your workers show up at https://something.faizan123.workers.dev, this value is 'faizan123'."
  type        = string
}

variable "worker_name" {
  description = "Name of the Cloudflare Worker. Becomes part of the live URL."
  type        = string
  default     = "student-task-manager"
}

variable "kv_namespace_name" {
  description = "Human-readable name for the Workers KV namespace that stores tasks."
  type        = string
  default     = "student_tasks"
}

variable "environment" {
  description = "Deployment environment label, exposed to the Worker as a plain-text binding."
  type        = string
  default     = "production"
}

variable "compatibility_date" {
  description = "Cloudflare Workers runtime compatibility date. Safe to leave at the default."
  type        = string
  default     = "2024-11-01"
}
