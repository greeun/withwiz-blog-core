import { defineConfig } from 'tsup';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const CLIENT_ENTRIES = [
  'components/admin/index',
  'components/public/index',
];

function addUseClientDirective() {
  for (const entry of CLIENT_ENTRIES) {
    for (const ext of ['.js', '.mjs']) {
      const filePath = resolve('dist', entry + ext);
      try {
        const content = readFileSync(filePath, 'utf-8');
        if (!content.startsWith('"use client"')) {
          writeFileSync(filePath, `"use client";\n${content}`);
        }
      } catch {}
    }
  }
}

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'types/index': 'src/types/index.ts',
    'services/index': 'src/services/index.ts',
    'routes/index': 'src/routes/index.ts',
    'routes/scheduler-routes': 'src/routes/scheduler-routes.ts',
    'validators/index': 'src/validators/index.ts',
    'components/admin/index': 'src/components/admin/index.ts',
    'components/public/index': 'src/components/public/index.ts',
    'presets/index': 'src/presets/index.ts',
    'utils/index': 'src/utils/index.ts',
    'seo/index': 'src/seo/index.ts',
    'i18n/index': 'src/i18n/index.ts',
    'errors/index': 'src/errors/index.ts',
  },
  format: ['cjs', 'esm'],
  dts: true,
  splitting: true,
  sourcemap: true,
  clean: true,
  external: [
    'react',
    'react/jsx-runtime',
    'next',
    'next/image',
    'next/link',
    'next/server',
    '@prisma/client',
    'zod',
    '@withwiz/block-editor',
    'isomorphic-dompurify',
  ],
  esbuildOptions(options) {
    options.jsx = 'automatic';
  },
  onSuccess: async () => {
    const stylesDir = resolve('dist', 'styles');
    mkdirSync(stylesDir, { recursive: true });
    copyFileSync(resolve('src', 'styles', 'blog-public.css'), resolve(stylesDir, 'blog-public.css'));
    copyFileSync(resolve('src', 'styles', 'blog-admin.css'), resolve(stylesDir, 'blog-admin.css'));
    copyFileSync(resolve('src', 'styles', 'blog-block-editor.css'), resolve(stylesDir, 'blog-block-editor.css'));
    addUseClientDirective();
  },
});
