# PostgreSQL Database Setup for Auth Service on Google Cloud

This guide contains step-by-step commands to set up a PostgreSQL database for the auth service in Google Cloud using Cloud SQL socket connections.

## Prerequisites

Make sure you have:
- Google Cloud CLI installed and configured
- Appropriate permissions to create resources in the project
- Project ID: `civil-forge-403609`

## 1. Set Default Project

```bash
gcloud config set project civil-forge-403609
```

## 2. Enable Required APIs

```bash
gcloud services enable sqladmin.googleapis.com cloudbuild.googleapis.com run.googleapis.com
```

## 3. Create a PostgreSQL Instance

```bash
gcloud sql instances create auth-db-instance \
  --database-version=POSTGRES_13 \
  --cpu=1 \
  --memory=3840MB \
  --region=us-central1 \
  --root-password=REPLACE_WITH_SECURE_PASSWORD
```

Note: Replace `REPLACE_WITH_SECURE_PASSWORD` with a secure password. Save this password securely.

## 4. Create the Database

```bash
gcloud sql databases create auth_db --instance=auth-db-instance
```

## 5. Create a Database User

```bash
gcloud sql users create auth-app-user \
  --instance=auth-db-instance \
  --password=REPLACE_WITH_SECURE_USER_PASSWORD
```

Note: Replace `REPLACE_WITH_SECURE_USER_PASSWORD` with a different secure password for the application user.

## 6. Get the Connection Information

```bash
gcloud sql instances describe auth-db-instance --format="value(connectionName)"
```

This will output something like: `civil-forge-403609:us-central1:auth-db-instance`
Save this as your INSTANCE_CONNECTION_NAME.

## 7. Create a Service Account for Cloud Run

```bash
gcloud iam service-accounts create auth-service-account \
  --description="Auth Service Account" \
  --display-name="Auth Service"
```

## 8. Grant Cloud SQL Access to Service Account

```bash
gcloud projects add-iam-policy-binding civil-forge-403609 \
  --member="serviceAccount:auth-service-account@civil-forge-403609.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

## 9. Create DATABASE_URL for Cloud SQL Socket Connection

Your DATABASE_URL should use this format for socket connections:

```
postgresql://auth-app-user:REPLACE_WITH_SECURE_USER_PASSWORD@localhost/auth_db?host=/cloudsql/INSTANCE_CONNECTION_NAME
```

Where:
- `auth-app-user` is the database user
- `REPLACE_WITH_SECURE_USER_PASSWORD` is the user password
- `INSTANCE_CONNECTION_NAME` is the connection name from step 6
- `auth_db` is the database name

## 10. Deploy to Cloud Run with Cloud SQL Socket Connection

Use the following command to deploy with socket connection:

```bash
gcloud run deploy auth-service \
  --image=gcr.io/civil-forge-403609/auth-service \
  --platform=managed \
  --region=us-central1 \
  --service-account=auth-service-account@civil-forge-403609.iam.gserviceaccount.com \
  --add-cloudsql-instances=civil-forge-403609:us-central1:auth-db-instance \
  --allow-unauthenticated \
  --set-env-vars="DATABASE_URL=postgresql://auth-app-user:REPLACE_WITH_SECURE_USER_PASSWORD@localhost/auth_db?host=/cloudsql/civil-forge-403609:us-central1:auth-db-instance" \
  --set-env-vars="INSTANCE_CONNECTION_NAME=civil-forge-403609:us-central1:auth-db-instance" \
  --set-env-vars="JWT_SECRET=REPLACE_WITH_SECURE_JWT_SECRET" \
  --set-env-vars="JWT_EXPIRES_IN=7d" \
  --set-env-vars="REFRESH_TOKEN_SECRET=REPLACE_WITH_SECURE_REFRESH_TOKEN_SECRET" \
  --set-env-vars="REFRESH_TOKEN_EXPIRES_IN=30d" \
  --set-env-vars="CORS_ORIGIN=https://appraisily.com"
```

Remember to replace all placeholder passwords and secrets with actual secure values.

## 11. Using Cloud Build for Deployments

If you're using Cloud Build, use the following command:

```bash
gcloud builds submit --config=cloudbuild.yaml --substitutions=_DB_PASSWORD=REPLACE_WITH_SECURE_USER_PASSWORD
```

## 12. Set Up Cloud SQL Auth Proxy (for local development)

To test locally:

```bash
# Download the proxy
wget https://dl.google.com/cloudsql/cloud_sql_proxy_x64.linux
chmod +x cloud_sql_proxy_x64.linux

# Run the proxy
./cloud_sql_proxy_x64.linux -instances=civil-forge-403609:us-central1:auth-db-instance=tcp:5432
```

Then set your local DATABASE_URL:

```
DATABASE_URL=postgresql://auth-app-user:REPLACE_WITH_SECURE_USER_PASSWORD@localhost:5432/auth_db
```

## Security Best Practices

1. Use Secret Manager for sensitive environment variables:
```bash
# Create secrets
gcloud secrets create db-password --replication-policy=automatic
echo -n "your-secure-password" | gcloud secrets versions add db-password --data-file=-

# Grant access to service account
gcloud secrets add-iam-policy-binding db-password \
  --member=serviceAccount:auth-service-account@civil-forge-403609.iam.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor

# Reference in Cloud Run
gcloud run deploy auth-service \
  ... other flags ... \
  --set-secrets=DB_PASSWORD=db-password:latest
```

2. Enable automatic backups for your Cloud SQL instance:
```bash
gcloud sql instances patch auth-db-instance \
  --backup-start-time=04:00 \
  --enable-bin-log
```

3. Set database flags for enhanced security:
```bash
gcloud sql instances patch auth-db-instance \
  --database-flags=log_checkpoints=on,log_connections=on,log_disconnections=on,log_lock_waits=on,log_temp_files=0
```

4. Setup monitoring alerts for database performance:
```bash
# Example command for setting up a CPU usage alert
gcloud alpha monitoring policies create \
  --display-name="High CPU Usage for auth-db-instance" \
  --conditions="condition-type=metric, metric=cloudsql.googleapis.com/database/cpu/utilization, comparison=COMPARISON_GT, threshold-value=0.8"
```