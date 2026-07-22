import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'

const config = [
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      sourceType: 'module'
    },
    plugins: {
      '@typescript-eslint': tsPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      semi: ['error', 'never'],
      quotes: ['error', 'single'],
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/naming-convention': ['error',
        {
          selector: 'function',
          format: ['camelCase', 'PascalCase']
        },
        {
          selector: ['variableLike', 'parameterProperty', 'classProperty', 'typeProperty'],
          format: ['PascalCase']
        }
      ]
    }
  }
]

export default config