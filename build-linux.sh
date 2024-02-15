#!/bin/bash

rm -rf dist out .vite
yarn package && yarn build-appimage && yarn build-flatpak

