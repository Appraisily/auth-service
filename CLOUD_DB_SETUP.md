# PostgreSQL Database Setup for Auth Service on Google Cloud

This guide contains step-by-step commands to set up a PostgreSQL database for the auth service in Google Cloud. Each command is provided separately so you can run them one at a time.

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
gcloud services enable sqladmin.googleapis.com
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

Note: Replace `REPLACE_WITH_SECURE_PASSWORD` with a secure password. Save this password securely as you'll need it later.

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

## 7. Get the IP Address (for Cloud Run connection)

```bash
gcloud sql instances describe auth-db-instance --format="value(ipAddresses[0].ipAddress)"
```

Save this IP address for your DATABASE_URL in the Cloud Run service.

## 8. Create Database URL for Cloud Run

Your DATABASE_URL should be in this format:

```
postgresql://auth-app-user:REPLACE_WITH_SECURE_USER_PASSWORD@IP_ADDRESS:5432/auth_db?schema=public
```

Where:
- `auth-app-user` is the database user
- `REPLACE_WITH_SECURE_USER_PASSWORD` is the user password
- `IP_ADDRESS` is the IP address from step 7
- `auth_db` is the database name

## 9. Set Up Cloud SQL Auth Proxy (for local development)

If you need to access the database from your local machine for development:

```bash
wget https://dl.google.com/cloudsql/cloud_sql_proxy_x64.linux
```

```bash
chmod +x cloud_sql_proxy_x64.linux
```

```bash
./cloud_sql_proxy_x64.linux -instances=civil-forge-403609:us-central1:auth-db-instance=tcp:5432
```

Note: This creates a local proxy on port 5432 that connects to your Cloud SQL instance.

## 10. Create a Service Account for Cloud Run

```bash
gcloud iam service-accounts create auth-service-account \
  --description="Auth Service Account" \
  --display-name="Auth Service"
```

## 11. Grant Cloud SQL Access to Service Account

```bash
gcloud projects add-iam-policy-binding civil-forge-403609 \
  --member="serviceAccount:auth-service-account@civil-forge-403609.iam.gserviceaccount.com" \
  --role="roles/cloudsql.client"
```

## 12. Set Up Cloud Run with Database Connection

When deploying to Cloud Run, use the following command:

```bash
gcloud run deploy appraisily-auth-service \
  --image=gcr.io/civil-forge-403609/appraisily-auth-service \
  --platform=managed \
  --region=us-central1 \
  --service-account=auth-service-account@civil-forge-403609.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --set-env-vars="DATABASE_URL=postgresql://auth-app-user:REPLACE_WITH_SECURE_USER_PASSWORD@IP_ADDRESS:5432/auth_db?schema=public" \
  --set-env-vars="JWT_SECRET=REPLACE_WITH_SECURE_JWT_SECRET" \
  --set-env-vars="JWT_EXPIRES_IN=7d" \
  --set-env-vars="REFRESH_TOKEN_SECRET=REPLACE_WITH_SECURE_REFRESH_TOKEN_SECRET" \
  --set-env-vars="REFRESH_TOKEN_EXPIRES_IN=30d" \
  --set-env-vars="CORS_ORIGIN=https://appraisily.com"
```

Remember to replace all placeholder passwords and secrets with actual secure values.

## 13. Run Migrations on Deployed Service

After deploying, run the database migrations:

```bash
gcloud run services update appraisily-auth-service \
  --region=us-central1 \
  --command="/bin/sh" \
  --args="./scripts/start.sh"
```

## Notes

- Save all passwords and secrets securely
- For production, consider using Secret Manager for sensitive environment variables
- Consider enabling backups for your database in production
- Monitor database performance and adjust resources as needed