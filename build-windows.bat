rmdir dist out .vite /s /q
CALL yarn package
CALL yarn build-win-portable
