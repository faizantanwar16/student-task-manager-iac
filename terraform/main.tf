# ------------------------------------------------------------------
# 1. Workers KV namespace — persistent storage for tasks
# ------------------------------------------------------------------
resource "cloudflare_workers_kv_namespace" "tasks" {
  account_id = var.account_id
  title      = var.kv_namespace_name
}

# ------------------------------------------------------------------
# 2. The Worker itself — serves the web app AND the REST API,
#    bound to the KV namespace above via the TASKS_KV binding.
# ------------------------------------------------------------------
resource "cloudflare_workers_script" "task_manager" {
  account_id     = var.account_id
  script_name    = var.worker_name
  content_file   = "${path.module}/../application/worker.js"
  content_sha256 = filesha256("${path.module}/../application/worker.js")
  main_module    = "worker.js"

  compatibility_date  = var.compatibility_date
  compatibility_flags = ["nodejs_compat"]

  bindings = [
    {
      type         = "kv_namespace"
      name         = "TASKS_KV"
      namespace_id = cloudflare_workers_kv_namespace.tasks.id
    },
    {
      type = "plain_text"
      name = "ENVIRONMENT"
      text = var.environment
    }
  ]
}

# ------------------------------------------------------------------
# 3. Publish the Worker on the free *.workers.dev subdomain so it
#    is reachable without needing a custom domain.
# ------------------------------------------------------------------
resource "cloudflare_workers_script_subdomain" "task_manager" {
  account_id  = var.account_id
  script_name = cloudflare_workers_script.task_manager.script_name
  enabled     = true
}
