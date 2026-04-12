import { defineConfig } from 'eslint/config'
import tsConfig from '@electron-toolkit/eslint-config-ts'
import prettierConfig from '@electron-toolkit/eslint-config-prettier'

export default defineConfig([tsConfig, prettierConfig])
