#!/bin/bash

rm -rf dist out .vite
yarn package && yarn build-win-portable
