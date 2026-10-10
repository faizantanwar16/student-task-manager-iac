output "worker_name" {
  description = "The deployed Worker's name"
  value       = cloudflare_workers_script.task_manager.script_name
}

output "kv_namespace_id" {
  description = "ID of the Workers KV namespace storing tasks"
  value       = cloudflare_workers_kv_namespace.tasks.id
}

output "application_url" {
  description = "Live URL of the deployed Student Task Manager"
  value       = "https://${cloudflare_workers_script.task_manager.script_name}.${var.workers_subdomain}.workers.dev"
}
