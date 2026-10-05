# Backend

The live ICP API is hosted on Azure App Service. This frontend repository does not
contain the deployable API; its source and Azure deployment workflow are maintained
in the `fictional-carnival` repository.

The frontend's production API URL is set in `.env.production`. Local development
uses `http://localhost:4000`.

The API uses PostgreSQL for application data and requires PostgreSQL connection
settings in Azure App Service. MongoDB is only used by historical migration and
inspection scripts, not by the running API.
