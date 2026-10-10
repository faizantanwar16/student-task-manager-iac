# Student Task Manager — Infrastructure as Code (Terraform + Cloudflare)

Automated deployment of a serverless Student Task Management app using **Terraform** to provision a **Cloudflare Worker** (compute) and **Cloudflare Workers KV** (storage) — no resource is ever created by hand in the Cloudflare dashboard.

```
Terraform ──▶ Cloudflare Worker ──▶ serves the web app + REST API
          └─▶ Workers KV namespace ──▶ stores tasks
```

---

## 1. Project Structure

```
student-task-manager-iac/
├── terraform/
│   ├── providers.tf              # Cloudflare provider config
│   ├── main.tf                   # KV namespace + Worker + subdomain
│   ├── variables.tf               # input variables
│   ├── outputs.tf                 # worker name, KV id, live URL
│   └── terraform.tfvars.example   # copy to terraform.tfvars and fill in
├── application/
│   ├── worker.js                  # THE deployed artifact — Terraform uploads this
│   ├── index.html, style.css, script.js   # reference copies for local preview only
├── .github/workflows/deploy.yml   # CI/CD: init → validate → plan → apply
├── screenshots/                   # put your evidence screenshots here
├── .gitignore
└── README.md
```

**Important:** the entire frontend (HTML/CSS/JS) is embedded as a string inside `application/worker.js`, because Cloudflare Workers can't serve a separate folder of static files without extra asset-binding tooling. The standalone `index.html`/`style.css`/`script.js` files are a reference copy so you can preview the UI in a browser without deploying — if you change the design, port the change into `worker.js` too, since that's what actually goes live.

---

## 2. Prerequisites

- A computer with internet access
- [Git](https://git-scm.com/downloads) installed — verify with `git --version`
- A GitHub account
- Node.js (only needed if you want to run the local test harness — not required to deploy)

---

## 3. Create a Cloudflare Account

1. Go to https://dash.cloudflare.com/sign-up and create a free account.
2. Verify your email.
3. Log in, then go to **Workers & Pages** in the left sidebar. The first time you open this, Cloudflare will ask you to **choose a workers.dev subdomain** (e.g. `faizan123`). Pick one and remember it exactly — you'll need it as `workers_subdomain` later. Your Worker's live URL will look like:
   ```
   https://student-task-manager.faizan123.workers.dev
   ```
4. **Do not manually create a Worker or KV namespace here.** This dashboard is only for verifying what Terraform creates later.

---

## 4. Get Your Cloudflare Account ID

1. In the Cloudflare dashboard, go to **Workers & Pages → Overview**.
2. Your **Account ID** is shown in the right-hand sidebar. Copy it.

---

## 5. Create a Cloudflare API Token

1. Click your profile icon (top right) → **My Profile** → **API Tokens**.
2. Click **Create Token**.
3. Choose **Create Custom Token**.
4. Under **Permissions**, add:
   - `Account` → `Workers Scripts` → `Edit`
   - `Account` → `Workers KV Storage` → `Edit`
5. Under **Account Resources**, select your account.
6. Click **Continue to summary** → **Create Token**.
7. **Copy the token immediately** — Cloudflare only shows it once. Store it somewhere safe (you'll paste it into `.tfvars` and GitHub Secrets, never into code).

---

## 6. Install Terraform

1. Download from https://developer.hashicorp.com/terraform/install for your OS.
2. Verify installation:
   ```bash
   terraform --version
   ```
   Expected: `Terraform v1.x.x`
   **Take a screenshot of this** — it's a required deliverable (Step 2 of the spec).

---

## 7. Configure Your Local Environment

```bash
cd student-task-manager-iac/terraform
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` and fill in your real values:

```hcl
cloudflare_api_token = "the token you copied in step 5"
account_id            = "the account ID you copied in step 4"
workers_subdomain     = "the workers.dev subdomain you chose in step 3"

worker_name       = "student-task-manager"
kv_namespace_name = "student_tasks"
environment       = "production"
```

`terraform.tfvars` is git-ignored — it will never be committed. Only `terraform.tfvars.example` (with placeholders) is tracked.

---

## 8. Run the Terraform Lifecycle

All commands run from inside the `terraform/` folder.

```bash
terraform init
```
Downloads the Cloudflare provider. Expected: `Terraform has been successfully initialized!`
**Screenshot required.**

```bash
terraform fmt
```
Formats your `.tf` files into standard style.

```bash
terraform validate
```
Expected: `Success! The configuration is valid.`
**Screenshot required.**

```bash
terraform plan
```
Shows what Terraform intends to create: the KV namespace, the Worker script, and the workers.dev subdomain binding (three `+` create actions).
**Screenshot required — highlight the resources being created.**

```bash
terraform apply
```
Type `yes` when prompted. Expected: `Apply complete! Resources: 3 added, 0 changed, 0 destroyed.`
**Screenshot required, along with the Worker and KV namespace visible in the Cloudflare dashboard afterward (for verification only — not manual creation).**

Check your live app:
```bash
terraform output application_url
```
Open that URL in a browser — you should see the Task Board.

---

## 9. Test the Application (CRUD)

In the deployed app:
1. **Create** — add a task, e.g. "Prepare Final Year Project Presentation" / High / Pending
2. **Read** — confirm it appears in the list
3. **Update** — click "Complete" on a task, confirm its status flips
4. **Delete** — click "Delete", confirm it disappears

Or test the REST API directly with `curl` (replace with your real URL):
```bash
curl https://student-task-manager.faizan123.workers.dev/api/tasks
```

---

## 10. Demonstrate Infrastructure Modification

Pick one configuration change, for example editing `worker_name` or `environment` in `terraform.tfvars`, then:

```bash
terraform plan
```
Observe the diff Terraform shows (`~` for modify).

```bash
terraform apply
```
Confirm the change took effect (e.g. new URL if you changed `worker_name`).

---

## 11. Version Control with Git

```bash
cd ..            # back to student-task-manager-iac root
git init
git add .
git commit -m "Initial Terraform configuration"
```

Create an empty repository on GitHub, then:
```bash
git remote add origin https://github.com/YOUR-USERNAME/student-task-manager-iac.git
git branch -M main
git push -u origin main
```

Use meaningful follow-up commits as you build, e.g.:
```
git commit -m "Added KV namespace"
git commit -m "Added Worker and KV binding"
git commit -m "Added CRUD API"
git commit -m "Added GitHub Actions workflow"
```

---

## 12. Configure GitHub Secrets (for CI/CD)

On GitHub: **your repo → Settings → Secrets and variables → Actions → New repository secret**. Add three secrets:

| Secret name | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | the token from step 5 |
| `CLOUDFLARE_ACCOUNT_ID` | the account ID from step 4 |
| `CLOUDFLARE_WORKERS_SUBDOMAIN` | your workers.dev subdomain from step 3 |

These are read by `.github/workflows/deploy.yml` and never appear in your code.

---

## 13. Trigger CI/CD

Make a small change, e.g. edit the masthead text inside `application/worker.js`, then:

```bash
git add .
git commit -m "Update application title"
git push
```

Go to your GitHub repo → **Actions** tab. You should see the "Deploy Infrastructure via Terraform" workflow run automatically: checkout → init → validate → plan → apply.
**Screenshot the successful run — required deliverable.**

---

## 14. Destroy and Recreate (Required Demonstration)

```bash
cd terraform
terraform plan -destroy
terraform destroy
```
Type `yes`. Expected: `Destroy complete!`
**Screenshot required.**

Verify in the Cloudflare dashboard that the Worker and KV namespace are gone.

Then recreate everything from source, with zero manual steps:
```bash
terraform plan
terraform apply
```
**Screenshot required** — this proves the infrastructure is fully reproducible from code.

---

## 15. Local Preview (Optional)

To eyeball the UI without deploying, open `application/index.html` directly in a browser (or serve it with `npx serve`). It won't be able to load real tasks unless you set `API_BASE` in `application/script.js` to your deployed Worker URL — it's a visual reference only, not the live app.

---

## 16. Deliverables Checklist

- [ ] Source code (this repository)
- [ ] Terraform configuration (`providers.tf`, `main.tf`, `variables.tf`, `outputs.tf`)
- [ ] Application code (`worker.js` + reference frontend files)
- [ ] GitHub repository with meaningful commit history
- [ ] `.github/workflows/deploy.yml` CI/CD configuration
- [ ] Screenshots: Terraform install, `init`, `validate`, `plan`, `apply`, Worker in dashboard, KV in dashboard, working app, create/update/delete operations, GitHub repo, GitHub Actions run, `destroy`, recreation
- [ ] Mini project report (see spec Section 32 for suggested chapter structure)

---

## 17. Troubleshooting

- **`terraform plan` shows an authentication error** — double check `cloudflare_api_token` in `terraform.tfvars` has no extra spaces and has both Workers Scripts:Edit and Workers KV Storage:Edit permissions.
- **App loads but tasks don't save** — check that the `TASKS_KV` binding in `main.tf` matches the `env.TASKS_KV` reference in `worker.js` exactly (case-sensitive).
- **404 on the live URL** — confirm `terraform apply` finished with `3 added` and that `cloudflare_workers_script_subdomain` shows `enabled = true`; the subdomain can take a minute to propagate the first time.
- **GitHub Actions fails on `terraform apply`** — check the three repository secrets are named exactly as in step 12, with no typos.
