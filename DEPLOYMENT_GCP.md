# Deploying to Google Cloud Platform (Cloud Run)

This guide explains how to deploy the **MediInsightViz** application to **Google Cloud Run**. Cloud Run is a fully managed compute platform that automatically scales your stateless containers.

## Prerequisites

1.  **Google Cloud Project**: Create a project in the [Google Cloud Console](https://console.cloud.google.com/).
2.  **Billing Enabled**: Ensure billing is enabled for your project.
3.  **Google Cloud CLI**: Install the `gcloud` CLI on your local machine. [Installation Guide](https://cloud.google.com/sdk/docs/install).

## Deployment Steps

### 1. Initialize Google Cloud CLI

Open your terminal and login:

```bash
gcloud auth login
gcloud config set project [YOUR_PROJECT_ID]
```

### 2. Enable Required Services

Enable the Cloud Run and Container Registry/Artifact Registry APIs:

```bash
gcloud services enable run.googleapis.com containerregistry.googleapis.com cloudbuild.googleapis.com
```

### 3. Deploy using Cloud Build

The easiest way to deploy is to use `gcloud run deploy` which can build your container in the cloud (using Cloud Build) and deploy it in one step.

Run the following command from the root of your project:

```bash
gcloud run deploy mediinsightviz \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production
```

*   `--source .`: Uploads your source code and builds the container using the `Dockerfile`.
*   `--allow-unauthenticated`: Makes the app accessible to the public (remove this if you want it private).
*   `--region us-central1`: You can change this to a region closer to you (e.g., `europe-west1`).

### 4. Configure Environment Variables

Your application requires specific environment variables to function (e.g., `OPENAI_API_KEY`). You can set these during deployment or update them later.

**To set them during deployment:**

Add them to the `--set-env-vars` flag (comma-separated):

```bash
gcloud run deploy mediinsightviz \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "NODE_ENV=production,OPENAI_API_KEY=sk-...,SESSION_SECRET=complex_secret_string"
```

**To update them later via UI:**

1.  Go to [Cloud Run Console](https://console.cloud.google.com/run).
2.  Click on your service (`mediinsightviz`).
3.  Click **Edit & Deploy New Revision**.
4.  Go to the **Variables & Secrets** tab.
5.  Add your variables:
    *   `OPENAI_API_KEY`: Your OpenAI API key.
    *   `SESSION_SECRET`: A random string for session security.
    *   `DATABASE_URL`: (Optional) Connection string if you are using an external database (e.g., Neon or Cloud SQL).
6.  Click **Deploy**.

## Database Considerations

This application uses a database (PostgreSQL via Drizzle ORM).

*   **Default**: By default, it might be using an in-memory or local setup depending on configuration. Cloud Run is **stateless**, so local files (like SQLite) will be lost on restart.
*   **Production**: You should connect to a managed PostgreSQL database.
    *   **Option A**: Use **Neon** (Serverless Postgres). Just set the `DATABASE_URL` environment variable to your Neon connection string.
    *   **Option B**: Use **Google Cloud SQL**. You will need to create a Cloud SQL instance and connect it to Cloud Run.

## Troubleshooting

*   **Build Fails**: Check the Cloud Build logs in the console. Ensure your `package.json` and `Dockerfile` are correct.
*   **App Crashes**: Check the Cloud Run logs. Look for "Container failed to start". Common causes are missing environment variables or port mismatch (Cloud Run expects port 8080, which our Dockerfile handles).
*   **502 Bad Gateway**: The application failed to start listening on the port within the timeout. Check logs.

## Continuous Deployment (Optional)

You can set up **Continuous Deployment** from GitHub:
1.  Go to Cloud Run Console.
2.  Click **Create Service**.
3.  Select **Continuously deploy new revisions from a source repository**.
4.  Connect your GitHub repository.
5.  Cloud Build will automatically deploy whenever you push to `main`.
