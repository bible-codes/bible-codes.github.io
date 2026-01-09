#!/bin/bash

echo "Building TorahBibleCodes Docker image..."
docker-compose build

echo "Starting TorahBibleCodes container..."
docker-compose run --rm torahbiblecodes

echo "Container stopped."