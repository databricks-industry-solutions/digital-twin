#!/bin/bash

echo "⬜ Changing to frontend directory..."
cd ./frontend && echo "✅ Changed to ./frontend!"

echo "⬜ Building frontend app..."
npm run build && echo "✅ Frontend build complete!"

echo "⬜ Removing old deployment directory..."
rm -r ../deployment && echo "✅ Old deployment directory removed!"

echo "⬜ Creating new deployment directory..."
mkdir ../deployment && echo "✅ New deployment directory created!"

echo "⬜ Copying build artifacts..."
cp -r ../frontend/build ../deployment/dist && echo "✅ Build artifacts copied!"


echo "⬜ Syncing serving app files..."
rsync -av --exclude='__pycache__' ../serving-app/ ../deployment/ && echo "✅ Serving app synced!"

echo "⬜ Syncing to Databricks workspace..."
databricks sync ../deployment/ /Workspace/Users/naim.achahboun@databricks.com/triple-serving-auto --profile e2-dogfood-staging && echo "✅ Synced to Databricks workspace!"

echo "⬜ Deploying Databricks app..."
databricks apps deploy triple-serving-auto \
   --source-code-path /Workspace/Users/naim.achahboun@databricks.com/triple-serving-auto \
   --profile e2-dogfood-staging && echo "✅ Databricks app deployed!"

echo "✅ All stages completed successfully!"