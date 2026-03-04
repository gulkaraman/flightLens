import { FlatCompat } from '@eslint/eslintrc';
import legacyConfig from './.eslintrc.cjs';

const compat = new FlatCompat({
  baseDirectory: import.meta.dirname
});

export default compat.config(legacyConfig);
