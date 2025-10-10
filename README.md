# Databricks Digital Twins
---
This repo contains an example of an end-to-end implementation of a Digital Twin
representing a ball bearing manufacturing process. The approach oulined here is
intended to be reusable in many other scenarios.

To guide you through the process, it is orchestrated as a series of notebooks.

## Installation
To install the accelerator, check out the repository to your local machine or a
Databricks workspace. It is packaged as a Databricks Asset Bundle which will run
the notebooks for you. To deploy and run the accelerator, use the following commands:

```shell
databricks bundle deploy
databricks bundle run setup_solution_accelerator
```

This assumes you have the Databricks CLI installed and you are logged in - if not,
check out [the documentation](https://docs.databricks.com/aws/en/dev-tools/cli/install)
for details on how to set this up.

When you are finished, run these commands to remove all the assets created by the
accelerator:

```shell
databricks bundle run teardown_solution_accelerator
databricks bundle destroy
```

## Overview of notebooks

The setup process is divided into several notebooks to illustrate how each part of
the solution is set up.

### 0-Parameters
This is where all the settings for the whole accelerator are configured - ensure
that you adjust them to suit your workspace.

### 1-Create-Sensor-Bronze-Table
We first need to define a table where Zerobus can store the telemetry received from
the IOT devices. This notebook shows how to prepare the table and will also generate
sample data if you do not yet have access to Zerobus.

### 2-Ingest-Data-Zerobus
With the bronze table created, we set up the Zerobus endpoint and connect it to that
table. This notebook shows how data can be written to the Zerobus API, although in
reality this would come from the IoT devices themselves.

### 3-Setup-Mapping-Pipeline
To convert the incoming sensor data into timestamped RDF triples that are compatible
with the twin model (also defined in RDF) we use Lakeflow Declarative Pipelines with
the spark-r2r library to do the mapping. The result is a Delta Lake table that is
ready to be used by the app.

### 4-Sync-To-Lakebase
To provide a more responsive experience to users, we also serve the latest sensor data
from Lakebase. By setting up a synced table, the system takes care of ensuring that the
latest value from each sensor is always present based on the timestamp.

### 5-Create-Serving-App
Finally, we set up a Databricks App that will serve the triple data and display the
twin model as an interactive graph. This notebook configures the app as well as giving
it access to the required tables.

### 6-Cleanup
When you are finished using this solution accelerator or just want a clean slate, this
notebook will remove all the resources created along the way.



&copy; 2025 Databricks, Inc. All rights reserved. The source in this notebook is provided subject to the Databricks License [https://databricks.com/db-license-source].  All included or referenced third party libraries are subject to the licenses set forth below.

To run this accelerator, clone this repo into a Databricks workspace. Attach the RUNME notebook to any cluster running a DBR 11.0 or later runtime, and execute the notebook via Run-All. A multi-step-job describing the accelerator pipeline will be created, and the link will be provided. Execute the multi-step-job to see how the pipeline runs.

The job configuration is written in the RUNME notebook in json format. The cost associated with running the accelerator is the user's responsibility.
