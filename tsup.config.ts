import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'types/index': 'src/types/index.ts',
    'services/index': 'src/services/index.ts',
    'routes/index': 'src/routes/index.ts',
    'utils/index': 'src/utils/index.ts',
    'errors/index': 'src/errors/index.ts',
    'seo/index': 'src/seo/index.ts',
    'i18n/index': 'src/i18n/index.ts',
    'validators/index': 'src/validators/index.ts',
    'storage/index': 'src/storage/index.ts',
    'components/admin/index': 'src/components/admin/index.ts',
    'components/public/index': 'src/components/public/index.ts',
    'components/admin/editor/index': 'src/components/admin/editor/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  clean: true,
  outExtension({ format }) {
    return {
      js: format === 'esm' ? '.mjs' : '.js',
    };
  },
  external: [
    'next',
    'next/server',
    'react',
    'react-dom',
    'zod',
    '@prisma/client',
    'isomorphic-dompurify',
    '@aws-sdk/client-s3',
    '@withwiz/block-editor',
    'slugify',
  ],
});
