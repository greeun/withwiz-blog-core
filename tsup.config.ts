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
    // package.json이 "type":"module"이므로 CJS는 반드시 .cjs로 출력해야
    // require() 경로에서 ESM으로 오인되지 않는다.
    return {
      js: format === 'esm' ? '.mjs' : '.cjs',
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
    '@tiptap/react',
    '@tiptap/starter-kit',
    '@tiptap/extension-link',
    '@tiptap/pm',
    'slugify',
    'client-only',
  ],
});
