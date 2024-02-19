#!/bin/bash

rm -rf dist out .vite
yarn package && yarn build-flatpak
rm -rf /tmp/flatpak-bundler*