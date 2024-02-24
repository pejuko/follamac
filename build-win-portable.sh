#!/bin/bash

rm -rf dist
yarn build && yarn build-win-portable
