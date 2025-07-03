import pluginReactHooks from 'eslint-plugin-react-hooks'
import pluginReact from 'eslint-plugin-react'

export default [
  {
    files: ['**/*.{tsx}'],
    plugins: {
      'react-hooks': pluginReactHooks,
      react: pluginReact
    },
    rules: {
      ...pluginReactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true }
      ]
    }
  }
]
